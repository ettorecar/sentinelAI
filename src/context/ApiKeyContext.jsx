import { createContext, useContext, useState } from "react";

const ApiKeyContext = createContext(["", () => {}]);

export const ApiKeyProvider = ({ children }) => {
  const [apiKey, setApiKey] = useState("");
  return (
    <ApiKeyContext.Provider value={[apiKey, setApiKey]}>
      {children}
    </ApiKeyContext.Provider>
  );
};

export const useApiKey = () => useContext(ApiKeyContext);
