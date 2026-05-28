import { CssBaseline, ThemeProvider, alpha, createTheme } from "@mui/material";
import { createContext, useContext, useEffect, useMemo, useState } from "react";

const ink = "#18242f";
const mist = "#647587";
const primary = "#3c627b";
const primaryDark = "#2d4c61";
const primaryLight = "#8eabbc";
const secondary = "#6f8595";
const secondaryDark = "#556977";
const secondaryLight = "#b7c4cd";

const ThemeModeContext = createContext({
  mode: "light",
  toggleMode: () => {}
});

function getMenuItems(menuList) {
  return Array.from(menuList.querySelectorAll('[role="option"], [role="menuitem"]')).filter(
    (item) => item.getAttribute("aria-disabled") !== "true" && !item.hasAttribute("disabled")
  );
}

function isVisibleElement(element) {
  if (!element) return false;
  const rect = element.getBoundingClientRect();
  return rect.width > 0 && rect.height > 0;
}

function getControlledOptionList(activeElement) {
  const document = activeElement?.ownerDocument;
  const controlledId = activeElement?.getAttribute("aria-controls") || activeElement?.getAttribute("aria-owns");
  if (controlledId) {
    const controlledElement = document?.getElementById(controlledId);
    if (controlledElement && isVisibleElement(controlledElement)) return controlledElement;
  }

  const currentList = activeElement?.closest?.('[role="listbox"], [role="menu"]');
  if (currentList && isVisibleElement(currentList)) return currentList;

  return Array.from(document?.querySelectorAll('[role="listbox"], [role="menu"]') || []).find(isVisibleElement) || null;
}

function getActiveOption(activeElement, items) {
  const activeDescendantId = activeElement?.getAttribute("aria-activedescendant");
  const activeDescendant = activeDescendantId ? activeElement.ownerDocument.getElementById(activeDescendantId) : null;
  if (activeDescendant && items.includes(activeDescendant)) return activeDescendant;
  if (items.includes(activeElement)) return activeElement;
  return null;
}

function getTriggerForOptionList(optionList) {
  if (!optionList?.id) return null;
  return optionList.ownerDocument.querySelector(
    `[aria-controls="${optionList.id}"], [aria-owns="${optionList.id}"]`
  );
}

function getFocusableElements(document) {
  return Array.from(
    document.querySelectorAll(
      'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
    )
  ).filter((element) => isVisibleElement(element) && element.getAttribute("aria-hidden") !== "true");
}

function focusNextElementAfter(element) {
  if (!element) return;
  const focusableElements = getFocusableElements(element.ownerDocument);
  const currentIndex = focusableElements.indexOf(element);
  if (currentIndex >= 0) {
    focusableElements[currentIndex + 1]?.focus();
  }
}

function handleGlobalOptionKeyboard(event) {
  if (!["ArrowUp", "ArrowDown", "Tab"].includes(event.key) || event.shiftKey) return;

  const activeElement = event.target?.ownerDocument?.activeElement;
  const optionList = getControlledOptionList(activeElement);
  if (!optionList) return;

  const items = getMenuItems(optionList);
  if (!items.length) return;

  const activeOption = getActiveOption(activeElement, items);
  const activeIndex = activeOption ? items.indexOf(activeOption) : -1;
  const usesActiveDescendant = Boolean(activeElement?.getAttribute("aria-activedescendant"));

  if ((event.key === "ArrowUp" || event.key === "ArrowDown") && usesActiveDescendant) {
    return;
  }

  if (event.key === "ArrowUp" && activeIndex === 0) {
    event.preventDefault();
    items.at(-1)?.focus();
    return;
  }

  if (event.key === "ArrowDown" && activeIndex === items.length - 1) {
    event.preventDefault();
    items[0]?.focus();
    return;
  }

  if (event.key === "Tab" && activeOption) {
    const trigger = getTriggerForOptionList(optionList) || activeElement;
    event.preventDefault();
    activeOption.click();
    window.setTimeout(() => focusNextElementAfter(trigger), 0);
  }
}

function handleMenuListKeyboard(event) {
  if (event.defaultPrevented) return;

  const items = getMenuItems(event.currentTarget);
  if (!items.length) return;

  const activeElement = event.currentTarget.ownerDocument.activeElement;
  const activeIndex = items.indexOf(activeElement);

  if (event.key === "ArrowUp" && activeIndex === 0) {
    event.preventDefault();
    items.at(-1)?.focus();
    return;
  }

  if (event.key === "ArrowDown" && activeIndex === items.length - 1) {
    event.preventDefault();
    items[0]?.focus();
    return;
  }

  if (event.key === "Tab" && !event.shiftKey && activeIndex >= 0) {
    event.preventDefault();
    activeElement.click();
  }
}

function createAppTheme(mode) {
  const isDark = mode === "dark";

  return createTheme({
    palette: {
      mode,
      primary: {
        main: primary,
        dark: primaryDark,
        light: primaryLight,
        contrastText: "#f7fffd"
      },
      secondary: {
        main: secondary,
        dark: secondaryDark,
        light: secondaryLight
      },
      success: {
        main: "#1f9d68"
      },
      warning: {
        main: "#b78a4d"
      },
      info: {
        main: "#5c89b8"
      },
      background: {
        default: isDark ? "#101821" : "#edf1f4",
        paper: isDark ? "#182330" : "#fbfcfd"
      },
      text: {
        primary: isDark ? "#eef4f8" : ink,
        secondary: isDark ? "#d6e4f1" : mist
      },
      divider: isDark ? "rgba(197, 215, 226, 0.14)" : "rgba(90, 118, 138, 0.16)"
    },
    shape: {
      borderRadius: 6
    },
    typography: {
      fontFamily: '"Aptos", "Segoe UI Variable Display", "Bahnschrift", sans-serif',
      h3: { fontWeight: 800, letterSpacing: "-0.045em" },
      h4: { fontWeight: 800, letterSpacing: "-0.04em" },
      h5: { fontWeight: 800, letterSpacing: "-0.03em" },
      h6: { fontWeight: 750, letterSpacing: "-0.02em" },
      subtitle1: { fontWeight: 700, letterSpacing: "-0.01em" },
      body1: { lineHeight: 1.7 },
      body2: { lineHeight: 1.65 },
      button: { fontWeight: 800, letterSpacing: "-0.01em", textTransform: "none" }
    },
    components: {
      MuiCssBaseline: {
        styleOverrides: {
          body: {
            backgroundColor: isDark ? "#101821" : "transparent",
            backgroundImage: isDark
              ? [
                  "radial-gradient(circle at 0% 0%, rgba(92,137,184,0.14), transparent 24%)",
                  "radial-gradient(circle at 100% 10%, rgba(79,140,255,0.10), transparent 22%)",
                  "linear-gradient(180deg, #101821 0%, #121d28 52%, #0d141d 100%)"
                ].join(", ")
              : [
                  "radial-gradient(circle at 0% 0%, rgba(142,171,188,0.18), transparent 22%)",
                  "radial-gradient(circle at 100% 10%, rgba(111,133,149,0.12), transparent 20%)",
                  "radial-gradient(circle at 50% 100%, rgba(92,137,184,0.10), transparent 28%)",
                  "linear-gradient(180deg, #f7f9fb 0%, #eef2f5 48%, #e8edf1 100%)"
                ].join(", ")
          }
        }
      },
      MuiCard: {
        styleOverrides: {
          root: {
            borderRadius: 8,
            border: isDark ? "1px solid rgba(197,215,226,0.12)" : "1px solid rgba(255,255,255,0.78)",
            background: isDark
              ? "linear-gradient(180deg, rgba(28,41,54,0.96), rgba(20,31,43,0.94))"
              : "linear-gradient(180deg, rgba(255,255,255,0.95), rgba(247,249,251,0.92))",
            boxShadow: isDark ? "0 18px 48px rgba(0, 0, 0, 0.24)" : "0 18px 48px rgba(24, 36, 47, 0.07)",
            backdropFilter: "blur(18px)"
          }
        }
      },
      MuiCardContent: {
        styleOverrides: {
          root: {
            "& .MuiGrid2-root": {
              minWidth: 0
            },
            "& .MuiFormControl-root": {
              minWidth: 0
            }
          }
        }
      },
      MuiMenuList: {
        defaultProps: {
          onKeyDown: handleMenuListKeyboard
        }
      },
      MuiAutocomplete: {
        defaultProps: {
          autoHighlight: true,
          autoSelect: true,
          disableListWrap: false,
          handleHomeEndKeys: true
        }
      },
      MuiButton: {
        styleOverrides: {
          root: {
            minHeight: 46,
            paddingInline: 18,
            borderRadius: 4,
            fontWeight: 800
          },
          contained: {
            boxShadow: "0 10px 24px rgba(60, 98, 123, 0.18)"
          },
          containedPrimary: {
            background: "linear-gradient(135deg, #4c728a 0%, #315367 100%)"
          },
          outlined: {
            borderWidth: 1.5
          },
          outlinedPrimary: {
            borderColor: alpha(primary, 0.22),
            backgroundColor: isDark ? "rgba(24,35,48,0.72)" : "rgba(255,255,255,0.72)"
          }
        }
      },
      MuiOutlinedInput: {
        styleOverrides: {
          root: {
            borderRadius: 2,
            background: isDark
              ? "linear-gradient(180deg, rgba(28,41,54,0.98), rgba(20,31,43,0.94))"
              : "linear-gradient(180deg, rgba(255,255,255,0.98), rgba(246,248,250,0.94))",
            boxShadow: isDark ? "inset 0 1px 0 rgba(255,255,255,0.06)" : "inset 0 1px 0 rgba(255,255,255,0.85)",
            transition: "box-shadow 160ms ease, border-color 160ms ease, background-color 160ms ease",
            "& fieldset": {
              borderColor: isDark ? "rgba(197,215,226,0.18)" : "rgba(104, 128, 146, 0.22)"
            },
            "&:hover fieldset": {
              borderColor: alpha(primary, 0.4)
            },
            "&.Mui-focused": {
              boxShadow: `0 0 0 3px ${alpha(primary, 0.10)}`
            },
            "&.Mui-focused fieldset": {
              borderWidth: 1.5,
              borderColor: primary
            }
          },
          input: {
            paddingBlock: 14
          },
          multiline: {
            paddingTop: 8,
            paddingBottom: 8
          }
        }
      },
      MuiTextField: {
        defaultProps: {
          fullWidth: true,
          variant: "outlined",
          InputLabelProps: {
            shrink: true
          }
        }
      },
      MuiInputLabel: {
        styleOverrides: {
          root: {
            color: isDark ? "#a8b7c4" : "#607286",
            fontWeight: 700
          }
        }
      },
      MuiDialog: {
        styleOverrides: {
          paper: {
            borderRadius: 8,
            border: isDark ? "1px solid rgba(197,215,226,0.12)" : "1px solid rgba(255,255,255,0.78)",
            background: isDark
              ? "linear-gradient(180deg, rgba(28,41,54,0.98), rgba(18,29,40,0.96))"
              : "linear-gradient(180deg, rgba(255,255,255,0.98), rgba(245,247,249,0.96))",
            boxShadow: isDark ? "0 28px 72px rgba(0, 0, 0, 0.38)" : "0 28px 72px rgba(24, 36, 47, 0.12)"
          }
        }
      },
      MuiDialogTitle: {
        styleOverrides: {
          root: {
            fontWeight: 800,
            letterSpacing: "-0.02em"
          }
        }
      },
      MuiDialogContent: {
        styleOverrides: {
          root: {
            overflowX: "hidden",
            "& .MuiGrid2-root": {
              minWidth: 0
            },
            "& .MuiFormControl-root": {
              minWidth: 0
            }
          }
        }
      },
      MuiChip: {
        styleOverrides: {
          root: {
            borderRadius: 4,
            fontWeight: 800,
            backdropFilter: "blur(12px)"
          }
        }
      },
      MuiToolbar: {
        styleOverrides: {
          root: {
            minHeight: 74
          }
        }
      },
      MuiBottomNavigation: {
        styleOverrides: {
          root: {
            backgroundColor: isDark ? "rgba(18,29,40,0.92)" : "rgba(251,254,254,0.90)",
            border: isDark ? "1px solid rgba(197,215,226,0.12)" : "1px solid rgba(255,255,255,0.75)",
            borderRadius: 8,
            backdropFilter: "blur(20px)",
            boxShadow: isDark ? "0 18px 40px rgba(0, 0, 0, 0.30)" : "0 18px 40px rgba(20, 33, 43, 0.10)"
          }
        }
      },
      MuiBottomNavigationAction: {
        styleOverrides: {
          root: {
            minWidth: 64,
            borderRadius: 4,
            "&.Mui-selected": {
              color: isDark ? "#eef4f8" : ink
            }
          },
          label: {
            fontSize: "0.72rem",
            fontWeight: 800
          }
        }
      }
    }
  });
}

export function useAppThemeMode() {
  return useContext(ThemeModeContext);
}

export function AppThemeProvider({ children }) {
  const [mode, setMode] = useState(() => {
    if (typeof window === "undefined") return "light";
    return window.localStorage.getItem("appThemeMode") === "dark" ? "dark" : "light";
  });

  const theme = useMemo(() => createAppTheme(mode), [mode]);
  const value = useMemo(
    () => ({
      mode,
      toggleMode: () => setMode((current) => (current === "dark" ? "light" : "dark"))
    }),
    [mode]
  );

  useEffect(() => {
    window.localStorage.setItem("appThemeMode", mode);
    document.documentElement.dataset.theme = mode;
  }, [mode]);

  useEffect(() => {
    document.addEventListener("keydown", handleGlobalOptionKeyboard, true);
    return () => {
      document.removeEventListener("keydown", handleGlobalOptionKeyboard, true);
    };
  }, []);

  return (
    <ThemeModeContext.Provider value={value}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        {children}
      </ThemeProvider>
    </ThemeModeContext.Provider>
  );
}

export default AppThemeProvider;
