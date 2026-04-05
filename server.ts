import app from "./src/app";
import { connectDB } from "./src/config/dbConnection";

const PORT = process.env.PORT || 5000;

connectDB(); // ✅ VERY IMPORTANT

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
