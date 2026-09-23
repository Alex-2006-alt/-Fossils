"use client";
import { useRef } from "react";
import type { PhotoItem } from "@/types";
export default function ArchiveArt({ photos = [] }: { photos?: PhotoItem[] }) {
  const ref = useRef<HTMLDivElement>(null);
  return (
    <div
      className="archive-art"
      ref={ref}
      aria-hidden="true"
      onPointerMove={(event) => {
        if (
          event.pointerType !== "mouse" ||
          window.matchMedia("(prefers-reduced-motion: reduce)").matches
        )
          return;
        const rect = event.currentTarget.getBoundingClientRect();
        ref.current?.style.setProperty(
          "--tilt-y",
          `${(event.clientX - rect.left - rect.width / 2) / 45}deg`,
        );
        ref.current?.style.setProperty(
          "--tilt-x",
          `${-(event.clientY - rect.top - rect.height / 2) / 45}deg`,
        );
      }}
      onPointerLeave={() => {
        ref.current?.style.setProperty("--tilt-y", "0deg");
        ref.current?.style.setProperty("--tilt-x", "0deg");
      }}
    >
      <div className="art-orbit" />
      <div className="art-orbit orbit-two" />
      <div className="photo-sculpture">
        {[0, 1, 2].map((index) => (
          <div className={`print print-${index}`} key={index}>
            {photos[index]?.thumbUrl &&
            photos[index].processingStatus === "READY" ? (
              <img
                src={photos[index].mediumUrl || photos[index].thumbUrl}
                alt=""
              />
            ) : (
              <div className={`paper-landscape landscape-${index}`}>
                <i className="paper-sun" />
                <i className="paper-hill hill-back" />
                <i className="paper-hill hill-front" />
              </div>
            )}
            <span>
              {
                [
                  "the little things",
                  "somewhere, together",
                  "a moment to keep",
                ][index]
              }
            </span>
          </div>
        ))}
      </div>
      <span className="art-seal">
        KEEP
        <br />
        FOREVER<span>✳</span>
      </span>
      <span className="art-caption">
        A little collection of a beautiful life.
      </span>
    </div>
  );
}
