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

//====================START OF NELLET ENDPOINTS
router.get("/user/:id", (req, res) => {
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
    if (result && result.Item) {
      result.Item.success = true;
      res.json(result.Item);
    } else {
      res.status(404).json({ error: `Nellet user with id: ${id} not found` });
    }
  });
});

router.post("/nellet/user/register", (req, res) => {
  console.log("req for nellet: ", req.body);
  const defaultPreferences = { darkMode: false };
  const email = req.body.email ?? false;
  const profilePicture =
    req.body.picture ??
    "http://www.quickmeme.com/img/4d/4d56e45853983bfeedced94719e78b2869e21252c3d85105f7b56320b8f959ab.jpg";
  const givenName = req.body.given_name ?? false;
  const familyName = req.body.family_name ?? false;
  const preferences = req.body.preferences ?? defaultPreferences;
  const id = req.body.sub ?? uuid.v4();
  const lastModified = req.body.updated_at ?? false;

  const params = {
    TableName: NELLET_USERS,
    Item: {
      id,
      email,
      profilePicture,
      givenName,
      familyName,
      preferences,
      lastModified,
    },
  };

  dynamoDb.put(params, (error) => {
    if (error) {
      res.status(400).json({ error: "Could not create nellet user" });
    }
    res.json({
      id,
    });
  });
});

router.post("/nellet/user/toggle_dark", (req, res) => {
  console.log("requested body: ", req);
  const id = req.body.id;
  const preferences = { darkMode: req.body.selection };

  const params = {
    TableName: NELLET_USERS,
    Key: {
      id,
    },
    UpdateExpression: "set #preferences = :preferences",
    ExpressionAttributeNames: { "#preferences": "preferences" },
    ExpressionAttributeValues: { ":preferences": preferences },
    ReturnValues: "ALL_NEW",
  };

  dynamoDb.update(params, (error, result) => {
    if (error) {
      res
        .status(400)
        .json({ error: "Could not update Nellet user -- darkMode" });
    }
    console.log("the darkMode result", result);
    res.json(result.Attributes);
  });
});
//====================END OF NELLET ENDPOINTS

//====================PLAID ENDPOINTS
// first need to create a link token, initiated by the frontend
router.post("/create_link_token", async (req, res) => {
  try {
    const response = await client.createLinkToken({
      user: {
        client_user_id: "1234-test-user-id",
      },
      client_name: "Plaid Test App",
      products: ["auth", "transactions"],
      country_codes: ["US"],
      language: "en",
      webhook: "https://sample-web-hook.com",
      account_filters: {
        depository: {
          account_subtypes: ["checking", "savings"],
        },
      },
    });

    return res.json({ link_token: response.link_token });
  } catch (err) {
    return res.json({ err: err.message });
  }
});

// Once we have a Link token, we need to exchange that for an access token
router.post("/get_access_token", async (req, res) => {
  //destructure publicToken in response data
  const { publicToken } = req.body;

  try {
    console.log(publicToken);
    const response = await client.exchangePublicToken(publicToken);
    console.log("accessTokenFuncData:", response);
    return res.json(response);
  } catch (err) {
    console.log("err in the access token: ", err);
    if (!publicToken) {
      return "no public token: ", err;
    }
  }
});

// Once we have an access token to the Plaid API, we can pull back data
router.post("/transactions", async (req, res) => {
  const { accessToken } = req.body;
  const response = await client
    .getTransactions(accessToken, "2020-01-01", "2021-01-31", {
      count: 250,
      offset: 0,
    })
    .catch((err) => {
      if (!accessToken) {
        return "no access token";
      }
    });
  console.log("transactionsFuncData:", response);
  const transactions = response.transactions;
  return res.send({ transactions: transactions });
});
//======================END OF PLAID ENDPOINTS

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