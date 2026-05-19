import { MemoryRouter } from "react-router-dom";
import { render, screen } from "@testing-library/react";
import { vi } from "vitest";
import App from "../App";

const mockUseAuth = vi.fn();

vi.mock("../providers/AuthProviderStable", () => ({
  useAuth: () => mockUseAuth()
}));

describe("App auth guard", () => {
  it("shows the login page when there is no authenticated user", async () => {
    mockUseAuth.mockReturnValue({
      user: null,
      loading: false
    });

    render(
      <MemoryRouter initialEntries={["/products"]}>
        <App />
      </MemoryRouter>
    );

    expect(await screen.findByRole("img", { name: "MARKLIGHT Lighting Trade" })).toBeInTheDocument();
  });

  it("shows a loader while auth state is loading", () => {
    mockUseAuth.mockReturnValue({
      user: null,
      loading: true
    });

    render(
      <MemoryRouter>
        <App />
      </MemoryRouter>
    );

    expect(screen.getByRole("progressbar")).toBeInTheDocument();
  });
});
