"use client";
import { useState } from "react";
import { useSession, signOut } from "next-auth/react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { request } from "@/lib/request";
type Member = { id: string; name: string; email: string; role: string };
type Settings = {
  name: string;
  locationVisible: boolean;
  faceRecognitionEnabled: boolean;
};
export default function FamilySettings() {
  const { data: session } = useSession();
  const role = session?.user?.role;
  const admin = role === "OWNER" || role === "ADMIN";
  const client = useQueryClient();
  const [password, setPassword] = useState(""),
    [current, setCurrent] = useState("");
  const [notice, setNotice] = useState("");
  const family = useQuery({
    queryKey: ["family-settings"],
    queryFn: () => request<Settings>("/api/family"),
  });
  const members = useQuery({
    queryKey: ["family-members"],
    enabled: admin,
    queryFn: () => request<{ items: Member[] }>("/api/family/members"),
  });
  const save = useMutation({
    mutationFn: ({ url, body }: { url: string; body: unknown }) =>
      request(url, body, "PATCH"),
    onSuccess: (data) => {
      client.invalidateQueries();
      setNotice("Changes saved.");
      if (data.signInRequired) void signOut({ callbackUrl: "/login" });
    },
  });
  return (
    <section className="settings-panel">
      <h2>Your family, your privacy.</h2>
      {role === "OWNER" && family.data && (
        <>
          <label className="check-row">
            <input
              type="checkbox"
              checked={family.data.locationVisible}
              disabled={save.isPending}
              onChange={(e) =>
                save.mutate({
                  url: "/api/family",
                  body: { locationVisible: e.target.checked },
                })
              }
            />
            Show photo locations in Places
          </label>
          <label className="check-row">
            <input
              type="checkbox"
              checked={family.data.faceRecognitionEnabled}
              disabled={save.isPending}
              onChange={(e) =>
                save.mutate({
                  url: "/api/family",
                  body: { faceRecognitionEnabled: e.target.checked },
                })
              }
            />
            Recognize faces locally in new uploads
          </label>
          <p>
            Face recognition requires the local worker’s face models. Turning it
            off stops new recognition.
          </p>
        </>
      )}
      {admin && (
        <>
          <h3>Family members</h3>
          {members.data?.items.map((m) => (
            <div className="member-row" key={m.id}>
              <div>
                <strong>{m.name}</strong>
                <p>{m.email}</p>
              </div>
              <span>{m.role}</span>
              {m.id !== session?.user?.id &&
                m.role !== "OWNER" &&
                (role === "OWNER" || m.role !== "ADMIN") && (
                  <>
                    <select
                      aria-label={"Role for " + m.name}
                      value={m.role}
                      disabled={save.isPending}
                      onChange={(e) =>
                        save.mutate({
                          url: "/api/family/members",
                          body: { userId: m.id, role: e.target.value },
                        })
                      }
                    >
                      {(role === "OWNER"
                        ? ["ADMIN", "MEMBER", "VIEWER"]
                        : ["MEMBER", "VIEWER"]
                      ).map((r) => (
                        <option key={r}>{r}</option>
                      ))}
                    </select>
                    <button
                      className="btn-secondary"
                      disabled={save.isPending}
                      onClick={() => {
                        if (
                          confirm(
                            "Remove " + m.name + "’s access to this family?",
                          )
                        )
                          save.mutate({
                            url: "/api/family/members",
                            body: { userId: m.id, remove: true },
                          });
                      }}
                    >
                      Remove access
                    </button>
                    {role === "OWNER" && (
                      <button
                        className="btn-secondary"
                        onClick={() => {
                          if (
                            confirm(
                              "Make " +
                                m.name +
                                " the owner? You will become an administrator.",
                            )
                          )
                            save.mutate({
                              url: "/api/family/members",
                              body: { userId: m.id, transferOwnership: true },
                            });
                        }}
                      >
                        Transfer ownership
                      </button>
                    )}
                  </>
                )}
            </div>
          ))}
        </>
      )}
      <button
        className="btn-secondary"
        onClick={async () => {
          try {
            await request("/api/account/verify", {});
            setNotice("Check your email for a verification link.");
          } catch (error) {
            setNotice(
              error instanceof Error ? error.message : "Could not send email.",
            );
          }
        }}
      >
        Verify my email
      </button>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          save.mutate({
            url: "/api/account",
            body: { currentPassword: current, newPassword: password },
          });
        }}
      >
        <h3>Change your password</h3>
        <label>
          Current password
          <input
            className="input-field"
            type="password"
            autoComplete="current-password"
            value={current}
            required
            onChange={(e) => setCurrent(e.target.value)}
          />
        </label>
        <label>
          New password
          <input
            className="input-field"
            type="password"
            autoComplete="new-password"
            minLength={12}
            maxLength={72}
            value={password}
            required
            onChange={(e) => setPassword(e.target.value)}
          />
        </label>
        <button className="btn-primary" disabled={save.isPending}>
          Change password & sign out
        </button>
      </form>
      <button
        className="btn-secondary"
        disabled={save.isPending}
        onClick={() =>
          save.mutate({ url: "/api/account", body: { revokeSessions: true } })
        }
      >
        Sign out all my devices
      </button>
      {notice && <p role="status">{notice}</p>}
      {(save.isError || family.isError || members.isError) && (
        <p className="form-alert" role="alert">
          {save.error?.message ||
            "Could not load settings. Reload to try again."}
        </p>
      )}
    </section>
  );
}
