const axios = require("axios");

async function run() {
  try {
    const loginResponse = await axios.post("http://localhost:3001/api/auth/login", {
      email: "admin@oxycure.com",
      password: "Admin@2026"
    });
    
    const token = loginResponse.data.token || loginResponse.data.access_token;
    console.log("Login successful");

    const backupResponse = await axios.get("http://localhost:3001/api/backup/create", {
      headers: { Authorization: "Bearer " + token }
    });

    console.log("Status:", backupResponse.status);
    console.log("Response (first 100 chars):", JSON.stringify(backupResponse.data).substring(0, 100));
  } catch (error) {
    console.error("Error:", error.response ? error.response.status : error.message);
    if (error.response) {
      console.error("Error body:", JSON.stringify(error.response.data).substring(0, 100));
    }
  }
}

run();
