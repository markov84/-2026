import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi } from "vitest";
import LoginPage from "../pages/LoginPage";

const mockLogin = vi.fn();

vi.mock("../providers/AuthProviderStable", () => ({
  useAuth: () => ({
    login: mockLogin
  })
}));

describe("LoginPage", () => {
  beforeEach(() => {
    mockLogin.mockReset();
  });

  it("renders the login form", () => {
    render(<LoginPage />);

    expect(screen.getByRole("img", { name: "MARKLIGHT Lighting Trade" })).toBeInTheDocument();
    expect(screen.getByLabelText("Потребител")).toHaveValue("admin");
    expect(screen.getByLabelText("Парола")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Вход" })).toBeInTheDocument();
  });

  it("submits credentials through auth provider", async () => {
    const user = userEvent.setup();
    mockLogin.mockResolvedValueOnce({});

    render(<LoginPage />);

    await user.clear(screen.getByLabelText("Потребител"));
    await user.type(screen.getByLabelText("Потребител"), "admin");
    await user.type(screen.getByLabelText("Парола"), "secret");
    await user.click(screen.getByRole("button", { name: "Вход" }));

    expect(mockLogin).toHaveBeenCalledWith("admin", "secret");
  });

  it("shows an error when login fails", async () => {
    const user = userEvent.setup();
    mockLogin.mockRejectedValueOnce({
      response: {
        data: {
          message: "Невалидни данни."
        }
      }
    });

    render(<LoginPage />);

    await user.type(screen.getByLabelText("Парола"), "wrong");
    await user.click(screen.getByRole("button", { name: "Вход" }));

    expect(await screen.findByText("Невалидни данни.")).toBeInTheDocument();
  });
});
