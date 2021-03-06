const express = require("express");
const exphbs = require('express-handlebars');
const bodyParser = require("body-parser");
const logger = require("morgan");
const mongoose = require("mongoose");
const path = require("path");
require("dotenv").config();

const request = require("request");
const cheerio = require("cheerio");

// Require all models
var db = require("./models");

var PORT = process.env.PORT || 3000;

// Initialize Express
var app = express();
app.set('view engine', 'html');
// Configure middleware

// Use morgan logger for logging requests
app.use(logger("dev"));
// Use body-parser for handling form submissions
app.use(bodyParser.urlencoded({ extended: true }));
// Use express.static to serve the public folder as a static directory
app.use(express.static("public"));

// Connect to the Mongo DB
var MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost/schemaexample";
// var MONGODB_URI = process.env.MONGODB_URI || "mongodb://gonescraping:webdev123@ds119768.mlab.com:19768/heroku_h0p0x2cw";

mongoose.Promise = Promise;
mongoose.connect(MONGODB_URI, {

});
// Routes
const baseURL = "https://www.reddit.com/r/programming/"
// A GET route for scraping the echoJS website
app.get("/scrape", function (req, res) {
  // First, we grab the body of the html with request
  request(baseURL, function (err, response, html) {
    // Then, we load that into cheerio and save it to $ for a shorthand selector
    var $ = cheerio.load(html);
    // console.log($);
    let promises = [];
    // Now, we grab every h2 within an article tag, and do the following:
    $(".Post article").each(function (i, element) {
      // Save an empty result object
      // console.log($(element).text());

      var result = {};


      // Add the text and href of every link, and save them as properties of the result object
      result.title = $(element)
        .find("h3")
        .text();
      result.link = baseURL + $(element)
        .find(".SQnoC3ObvgnGjWt90zD9Z")
        .attr("href");
      console.log(result);
      // Create a new Article using the `result` object built from scraping
      const p = db.Article.create(result)
      promises.push(p);

    });

    Promise.all(promises)
      .then(function (dbArticles) {
        // View the added result in the console
        console.log(dbArticles);
        res.send("Scrape Complete");
      })
      .catch(function (err) {
        // If an error occurred, send it to the client
        return res.json(err);
      });
    // If we were able to successfully scrape and save an Article, send a message to the client
    
  });
});


// Route for getting all Articles from the db
app.get("/articles", function (req, res) {
  // Grab every document in the Articles collection
  db.Article.find({})
    .then(function (dbArticle) {
      // If we were able to successfully find Articles, send them back to the client
      res.json(dbArticle);
    })
    .catch(function (err) {
      // If an error occurred, send it to the client
      res.json(err);
    });
});

// Route for grabbing a specific Article by id, populate it with it's note
app.get("/articles/:id", function (req, res) {
  // Using the id passed in the id parameter, prepare a query that finds the matching one in our db...
  db.Article.findOne({ _id: req.params.id })
    // ..and populate all of the notes associated with it
    .populate("note")
    .then(function (dbArticle) {
      // If we were able to successfully find an Article with the given id, send it back to the client
      res.json(dbArticle);
    })
    .catch(function (err) {
      // If an error occurred, send it to the client
      res.json(err);
    });
});

// Route for saving/updating an Article's associated Note
app.post("/articles/:id", function (req, res) {
  // Create a new note and pass the req.body to the entry
  db.Note.create(req.body)
    .then(function (dbNote) {
      // If a Note was created successfully, find one Article with an `_id` equal to `req.params.id`. Update the Article to be associated with the new Note
      // { new: true } tells the query that we want it to return the updated User -- it returns the original by default
      // Since our mongoose query returns a promise, we can chain another `.then` which receives the result of the query
      return db.Article.findOneAndUpdate({ _id: req.params.id }, { note: dbNote._id }, { new: true });
    })
    .then(function (dbArticle) {
      // If we were able to successfully update an Article, send it back to the client
      res.json(dbArticle);
    })
    .catch(function (err) {
      // If an error occurred, send it to the client
      res.json(err);
    });
});

app.get("/", function (req, res) {
  res.sendFile(path.join(__dirname, "./public/home.html"));
});

// Start the server
app.listen(PORT, function () {
  console.log("App running on port " + PORT + "!");
});