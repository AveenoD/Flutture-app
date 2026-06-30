const express = require("express");
const swaggerUi = require("swagger-ui-express");
const YAML = require("yamljs");
const path = require("path");

const app = express();

const specPath = path.join(__dirname, "../docs/open-api.yml");
const swaggerDocument = YAML.load(specPath);

app.use("/", swaggerUi.serve, swaggerUi.setup(swaggerDocument));

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`Swagger UI running at http://localhost:${PORT}`);
});
