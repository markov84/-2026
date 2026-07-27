export function getErrorMessage(error, fallbackMessage) {
  const responseData = error?.response?.data;

  if (typeof responseData === "string" && responseData.trim()) {
    return responseData.trim();
  }

  if (responseData && typeof responseData === "object") {
    if (typeof responseData.message === "string" && responseData.message.trim()) {
      if (Array.isArray(responseData.errors) && responseData.errors.length > 0) {
        const firstError = responseData.errors
          .map((item) => item?.msg || item?.message || item?.param || "")
          .filter(Boolean)
          .join("; ");

        return firstError ? `${responseData.message.trim()} (${firstError})` : responseData.message.trim();
      }

      return responseData.message.trim();
    }

    if (Array.isArray(responseData.errors) && responseData.errors.length > 0) {
      const firstError = responseData.errors
        .map((item) => item?.msg || item?.message || item?.param || "")
        .filter(Boolean)
        .join("; ");

      if (firstError) {
        return firstError;
      }
    }
  }

  return error?.message || fallbackMessage;
}