import { index, type RouteConfig, route } from "@react-router/dev/routes";

export default [
  index("routes/home.tsx"),
  route("table", "routes/table.tsx"),
  route("quiz", "routes/quiz.tsx"),
] satisfies RouteConfig;
