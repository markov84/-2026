import { MemoryRouter } from "react-router-dom";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi } from "vitest";
import CustomersPageStable from "../pages/CustomersPageStable";

const toastError = vi.fn();
const toastSuccess = vi.fn();

vi.mock("react-hot-toast", () => ({
  default: {
    error: (...args) => toastError(...args),
    success: (...args) => toastSuccess(...args)
  }
}));

vi.mock("../hooks/useMobileDetection", () => ({
  useMobileDetection: () => false
}));

vi.mock("../hooks/useFetch", () => ({
  useFetch: (path) => {
    if (path === "/customers") {
      return { data: [], loading: false, setData: vi.fn() };
    }
    if (path === "/stores") {
      return { data: [], loading: false, setData: vi.fn() };
    }
    return { data: [], loading: false, setData: vi.fn() };
  }
}));

describe("CustomersPageStable", () => {
  beforeEach(() => {
    toastError.mockReset();
    toastSuccess.mockReset();
  });

  it("shows validation error when trying to create a person without a name", async () => {
    const user = userEvent.setup();

    render(
      <MemoryRouter>
        <CustomersPageStable />
      </MemoryRouter>
    );

    await user.click(screen.getByRole("button", { name: "Добави клиент" }));

    expect(toastError).toHaveBeenCalledWith("Името на клиента е задължително.");
  });

  it("shows validation error when trying to create a company without company name", async () => {
    const user = userEvent.setup();

    render(
      <MemoryRouter>
        <CustomersPageStable />
      </MemoryRouter>
    );

    await user.click(screen.getByRole("button", { name: "Фирма" }));
    await user.click(screen.getByRole("button", { name: "Добави клиент" }));

    expect(toastError).toHaveBeenCalledWith("Името на фирмата е задължително.");
  });
});
