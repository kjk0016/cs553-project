import path from "node:path";
import dotenv from "dotenv";

dotenv.config({ path: path.resolve(__dirname, "../../../../.env") });

// require a database connection string before starting the API
const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
	throw new Error("DATABASE_URL must be provided");
}

const jwtSecret = process.env.JWT_SECRET;
if (!jwtSecret) {
	throw new Error("JWT_SECRET must be provided");
}

// export the configuration values used by the server
export const env = {
	port: Number(process.env.PORT || 3000),
	databaseUrl,
	jwtSecret,
};
