import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi } from "vitest";
import { AuthProvider, useAuth } from "../providers/AuthProviderStable";

const mockState = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
  toast: {
    success: vi.fn(),
    error: vi.fn()
  }
}));

vi.mock("../lib/api", () => ({
  default: {
    get: (...args) => mockState.get(...args),
    post: (...args) => mockState.post(...args)
  }
}));

vi.mock("react-hot-toast", () => ({
  default: mockState.toast,
  success: mockState.toast.success,
  error: mockState.toast.error
}));

function TestConsumer() {
  const { loading, user, login } = useAuth();

  return (
    <div>
      <div data-testid="status">{loading ? "loading" : user?.username || "anon"}</div>
      <button type="button" onClick={() => login("admin", "secret")}>
        login
      </button>
    </div>
  );
}

function createDeferred() {
  let resolve;
  let reject;
  const promise = new Promise((res, rej) => {
    resolve = res;
    reject = rej;
  });

  return { promise, resolve, reject };
}

describe("AuthProviderStable", () => {
  beforeEach(() => {
    sessionStorage.clear();
    localStorage.clear();
    mockState.get.mockReset();
    mockState.post.mockReset();
    mockState.toast.success.mockReset();
    mockState.toast.error.mockReset();
  });

  it("does not let a stale session check clear a newer login", async () => {
    const staleCheck = createDeferred();

    sessionStorage.setItem("mark-light-token", "stale-token");
    mockState.get.mockReturnValueOnce(staleCheck.promise);
    mockState.post.mockResolvedValueOnce({
      data: {
        token: "fresh-token",
        user: { username: "admin" }
      }
    });

    const user = userEvent.setup();

    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    );

    await user.click(screen.getByRole("button", { name: "login" }));

    expect(sessionStorage.getItem("mark-light-token")).toBe("fresh-token");

    await act(async () => {
      staleCheck.reject({ response: { status: 401 } });
      await Promise.resolve();
      await Promise.resolve();
    });

    await waitFor(() => expect(screen.getByTestId("status")).toHaveTextContent("admin"), { timeout: 5000 });
    expect(sessionStorage.getItem("mark-light-token")).toBe("fresh-token");
  });

  it("retries login when the backend is temporarily unavailable", async () => {
    mockState.get.mockResolvedValueOnce({ data: { user: null } });
    mockState.post
      .mockRejectedValueOnce({ code: "ECONNABORTED" })
      .mockRejectedValueOnce({ code: "ERR_NETWORK" })
      .mockResolvedValueOnce({
        data: {
          token: "fresh-token",
          user: { username: "admin" }
        }
      });

    const user = userEvent.setup();

    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    );

    await waitFor(() => expect(screen.getByTestId("status")).toHaveTextContent("anon"));
    await user.click(screen.getByRole("button", { name: "login" }));

    await waitFor(() => expect(screen.getByTestId("status")).toHaveTextContent("admin"), { timeout: 5000 });
    expect(mockState.post).toHaveBeenCalledTimes(3);
    expect(sessionStorage.getItem("mark-light-token")).toBe("fresh-token");
  });
});