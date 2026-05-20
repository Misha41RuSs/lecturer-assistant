import { RouterProvider } from "react-router";
import { router } from "./routes";
import { Toaster } from "../shared/sonner";

export default function App() {
  return (
    <>
      <Toaster position="top-right" richColors />
      <RouterProvider router={router} />
    </>
  );
}