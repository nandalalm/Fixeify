import userRoutes from "./userRoutes";
import proRoutes from "./proRoutes";
import adminRoutes from "./adminRoutes";
import { Route } from "react-router-dom";
import NotFound from "@/pages/Fallback/NotFound";

const allRoutes = (
  <>
    {userRoutes}
    {proRoutes}
    {adminRoutes}
    <Route path="*" element={<NotFound />} />
  </>
);

export default allRoutes;