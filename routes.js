const AWS = require("aws-sdk");
const express = require("express");
const uuid = require("uuid");

const IS_OFFLINE = process.env.NODE_ENV !== "production";
const NELLET_USERS = process.env.TABLE_NELLET_USERS;

const dynamoDb =
  IS_OFFLINE === true
    ? new AWS.DynamoDB.DocumentClient({
        region: "eu-west-2",
        endpoint: "http://127.0.0.1:8080",
      })
    : new AWS.DynamoDB.DocumentClient();

const router = express.Router();

//====================NELLET USERS
//DONE
router.get("/nellet/user", (req, res) => {
  console.log("hit0");
  const params = {
    TableName: NELLET_USERS,
  };
  dynamoDb.scan(params, (error, result) => {
    if (error) {
      res
        .status(400)
        .json({ error: "Error fetching the nellet data -- users" });
    }
    res.json(result.Items);
  });
});
//DONE
router.get("/nellet/user/:id", (req, res) => {
  const id = req.params.id;

  const params = {
    TableName: NELLET_USERS,
    Key: {
      id,
    },
  };

  dynamoDb.get(params, (error, result) => {
    if (error) {
      res.status(400).json({ error: "Error retrieving nellet user" });
    }
    if (result.Item) {
      res.json(result.Item);
    } else {
      res.status(404).json({ error: `Nellet user with id: ${id} not found` });
    }
  });
});

router.post("/nellet/user/register", (req, res) => {
  console.log("hit1");
  const defaultPreferences = { darkMode: false };
  const email = req.body.email;
  const profilePicture =
    req.body.profilePicture ??
    "http://www.quickmeme.com/img/4d/4d56e45853983bfeedced94719e78b2869e21252c3d85105f7b56320b8f959ab.jpg";
  const givenName = req.body.givenName;
  const familyName = req.body.familyName;
  const preferences = req.body.preferences ?? defaultPreferences;
  const id = uuid.v4(); //I want this to be the google or whatever socail login id.

  const params = {
    TableName: NELLET_USERS,
    Item: {
      id,
      email,
      profilePicture,
      givenName,
      familyName,
      preferences,
    },
  };

  dynamoDb.put(params, (error) => {
    if (error) {
      res.status(400).json({ error: "Could not create nellet user" });
    }
    res.json({
      id,
      email,
    });
  });
});

router.delete("/nellet/user/:id", (req, res) => {
  const id = req.params.id;

  const params = {
    TableName: NELLET_USERS,
    Key: {
      id,
    },
  };

  dynamoDb.delete(params, (error) => {
    if (error) {
      res.status(400).json({ error: "Could not delete Nellet user" });
    }
    res.json({ success: true });
  });
});

module.exports = router;
