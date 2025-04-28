import userRoutes from "./userRoutes";
import proRoutes from "./proRoutes";
import adminRoutes from "./adminRoutes";

const allRoutes = (
  <>
    {userRoutes}
    {proRoutes}
    {adminRoutes}
  </>
);

export default allRoutes;