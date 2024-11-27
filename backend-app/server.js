const express = require('express');
const bodyParser = require("body-parser");
const fs = require('fs');
const cors = require("cors");
const path = require('path');

const app = express();
const port = 3000;

app.use(bodyParser.json()); 
app.use(express.static("public")); 
app.use(cors()); 
let levels = {};

// get a specific level by ID
app.get("/level/:id", (req, res) => {
    const levelId = req.params.id;
    const filePath = path.join(__dirname, "levels", `${levelId}.json`);

    fs.readFile(filePath, "utf8", (err, data) => {
        if (err) {
            console.error("Error reading level data: ", err);
            return res.status(404).send("Level not found");
        }
        try {
            const levelData = JSON.parse(data); // Parse the file content to JSON
            res.json(levelData); // Send the JSON object
        } catch (parseError) {
            console.error("Error parsing level data: ", parseError);
            res.status(500).send("Error parsing level data");
        }
    });
});

//  to save a level by ID
app.post("/level/:id", (req, res) => {
    const levelId = req.params.id;
    const filePath = path.join(__dirname, "levels", `${levelId}.json`);
    const levelData = req.body;

    if (!Array.isArray(levelData) || levelData.length === 0) {
        return res.status(400).send("Level data must be a non-empty array");
    }

    fs.writeFile(filePath, JSON.stringify(levelData, null, 2), (err) => {
        if (err) {
            console.error("Error saving level data", err);
            return res.status(500).send("Server error");
        }
        res.status(200).send("Level saved successfully");
    });
});

//  to get the list of all levels
app.get("/levels", (req, res) => {
    fs.readdir("levels", (err, files) => {
        if (err) {
            console.error("Error reading levels directory: ", err);
            return res.status(500).send("Server error");
        }
        const levelIds = files
            .filter(file => file.endsWith(".json"))
            .map(file => path.basename(file, ".json"));

        res.json(levelIds); // Send the list of level ids
    });
});

// Create the "levels" directory if it doesn't exist
if (!fs.existsSync("levels")) {
    fs.mkdirSync("levels");
}

// Start the server
app.listen(port, () => {
    console.log(`Server is running at http://localhost:${port}`);
});