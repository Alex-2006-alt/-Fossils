import { NextResponse } from "next/server";
import { withFamilyAuth } from "@/lib/api-auth";
import { prisma } from "@/lib/db";
import { z } from "zod";
import {
  jsonBody,
  HttpError,
  idSchema,
  nameSchema,
} from "@famvault/runtime/security";
const schema = z.object({
  id: idSchema.optional(),
  displayName: nameSchema,
  relationship: z.enum([
    "GRANDPARENT",
    "PARENT",
    "CHILD",
    "SIBLING",
    "SPOUSE",
    "OTHER",
  ]),
  birthday: z.iso.datetime().nullable().optional(),
  personId: idSchema.nullable().optional(),
  photoMediaId: idSchema.nullable().optional(),
  parentIds: z.array(idSchema).max(2).default([]),
});
export const GET = withFamilyAuth(async (req, ctx) =>
  NextResponse.json({
    items: (
      await prisma.familyTreeNode.findMany({
        where: { familyId: ctx.familyId },
        orderBy: { createdAt: "asc" },
      })
    ).map((n) => ({ ...n, parentIds: JSON.parse(n.parentIds) })),
  }),
);
export const POST = withFamilyAuth(
  async (req, ctx) => {
    const body = schema.parse(await jsonBody(req));
    const node = await prisma.$transaction(async (tx) => {
      const nodes = await tx.familyTreeNode.findMany({
        where: { familyId: ctx.familyId },
      });
      if (body.id && !nodes.some((n) => n.id === body.id))
        throw new HttpError(404, "Node not found");
      if (
        body.personId &&
        !(await tx.person.findFirst({
          where: { id: body.personId, familyId: ctx.familyId },
        }))
      )
        throw new HttpError(400, "Invalid person");
      if (
        body.photoMediaId &&
        !(await tx.media.findFirst({
          where: {
            id: body.photoMediaId,
            familyId: ctx.familyId,
            deletedAt: null,
          },
        }))
      )
        throw new HttpError(400, "Invalid photo");
      const graph = new Map(
        nodes.map((n) => [n.id, JSON.parse(n.parentIds) as string[]]),
      );
      const id = body.id || "new";
      graph.set(id, body.parentIds);
      for (const parent of body.parentIds)
        if (!nodes.some((n) => n.id === parent))
          throw new HttpError(400, "Parent must belong to your family");
      const visiting = new Set<string>(),
        visited = new Set<string>();
      function visit(key: string) {
        if (visiting.has(key))
          throw new HttpError(400, "Parent relationships cannot form a cycle");
        if (visited.has(key)) return;
        visiting.add(key);
        for (const parent of graph.get(key) || []) visit(parent);
        visiting.delete(key);
        visited.add(key);
      }
      visit(id);
      const data = {
        familyId: ctx.familyId,
        displayName: body.displayName,
        relationship: body.relationship,
        birthday: body.birthday ? new Date(body.birthday) : null,
        personId: body.personId,
        photoMediaId: body.photoMediaId,
        parentIds: JSON.stringify([...new Set(body.parentIds)]),
      };
      return body.id
        ? tx.familyTreeNode.update({ where: { id: body.id }, data })
        : tx.familyTreeNode.create({ data });
    });
    return NextResponse.json({ id: node.id });
  },
  { minRole: "ADMIN" },
);
export const DELETE = withFamilyAuth(
  async (req, ctx) => {
    const { id } = z.object({ id: idSchema }).parse(await jsonBody(req));
    await prisma.$transaction(async (tx) => {
      const deleted = await tx.familyTreeNode.deleteMany({
        where: { id, familyId: ctx.familyId },
      });
      if (!deleted.count) throw new HttpError(404, "Node not found");
      const nodes = await tx.familyTreeNode.findMany({
        where: { familyId: ctx.familyId },
      });
      for (const n of nodes) {
        const parents = JSON.parse(n.parentIds) as string[];
        if (parents.includes(id))
          await tx.familyTreeNode.update({
            where: { id: n.id },
            data: {
              parentIds: JSON.stringify(parents.filter((p) => p !== id)),
            },
          });
      }
    });
    return NextResponse.json({ success: true });
  },
  { minRole: "ADMIN" },
);
