import { describe, it, expect } from "vitest";
import React from "react";
import { renderToString } from "react-dom/server";
import { Skeleton, SkeletonBox } from "./skeleton";
import { CardSkeleton } from "@/components/Cards";

describe("Skeleton component (Arc UI + Skullet)", () => {
  it("renders with role status and aria-busy when loading", () => {
    const html = renderToString(React.createElement(Skeleton, { label: "載入文章中" }));
    expect(html).toContain('role="status"');
    expect(html).toContain('aria-label="載入文章中"');
    expect(html).toContain('aria-busy="true"');
    expect(html).toContain("skullet-bar");
  });

  it("renders avatar when avatar prop is true", () => {
    const withoutAvatar = renderToString(React.createElement(Skeleton, { avatar: false }));
    const withAvatar = renderToString(React.createElement(Skeleton, { avatar: true }));
    expect(withoutAvatar).not.toContain("avatar");
    expect(withAvatar).toContain("avatar");
  });

  it("clamps lines count between 1 and 6", () => {
    const html1 = renderToString(React.createElement(Skeleton, { lines: 0 }));
    const html5 = renderToString(React.createElement(Skeleton, { lines: 5 }));
    const html10 = renderToString(React.createElement(Skeleton, { lines: 10 }));

    // Count occurrences of skullet-bar lines (without avatar)
    const countBars = (str: string) => (str.match(/skullet-bar/g) || []).length;
    expect(countBars(html1)).toBe(1);
    expect(countBars(html5)).toBe(5);
    expect(countBars(html10)).toBe(6);
  });

  it("reveals children when loading is false", () => {
    const html = renderToString(
      React.createElement(
        Skeleton,
        { loading: false },
        React.createElement("div", { id: "real-content" }, "文章本體")
      )
    );
    expect(html).toContain("real-content");
    expect(html).toContain("文章本體");
  });
});

describe("SkeletonBox component (Skullet primitive)", () => {
  it("renders a skullet-bar with custom width, height, and border-radius", () => {
    const html = renderToString(
      React.createElement(SkeletonBox, {
        width: 120,
        height: 24,
        radius: 8,
        className: "test-skeleton-bar",
      })
    );
    expect(html).toContain("skullet-bar");
    expect(html).toContain("test-skeleton-bar");
    expect(html).toContain("width:120px");
    expect(html).toContain("height:24px");
    expect(html).toContain("border-radius:8px");
  });
});

describe("CardSkeleton component (Unified Shimmer Card)", () => {
  it("renders with skullet-sweep container and multiple skullet-bone elements", () => {
    const html = renderToString(React.createElement(CardSkeleton));
    expect(html).toContain("skullet-sweep");
    expect(html).toContain("skullet-bone");
    expect(html).toContain("aspect-video");
    // Verify it contains image box and title/tag lines
    const boneCount = (html.match(/skullet-bone/g) || []).length;
    expect(boneCount).toBeGreaterThanOrEqual(5);
  });
});
