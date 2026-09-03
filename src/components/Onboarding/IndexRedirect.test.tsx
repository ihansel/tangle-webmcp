import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { IndexRedirect } from "./IndexRedirect";

vi.mock("@tanstack/react-router", () => ({
  Navigate: ({ to }: { to: string }) => <div data-testid="navigate">{to}</div>,
}));

afterEach(cleanup);

const target = () => screen.queryByTestId("navigate");

describe("IndexRedirect", () => {
  it("redirects the demo root to the WebMCP lab", () => {
    render(<IndexRedirect />);
    expect(target()).toHaveTextContent("/dashboard");
  });
});
