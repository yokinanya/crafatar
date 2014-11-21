var helpers = require('../modules/helpers');
var router = require('express').Router();
var config = require('../modules/config');
var skins = require('../modules/skins');
var networking = require('../modules/networking')

var human_status = {
  0: "none",
  1: "cached",
  2: "checked",
  3: "downloaded",
  "-1": "error"
};

/* GET avatar request. */
router.get('/:uuid.:ext?', function(req, res) {
  var uuid = req.params.uuid;
  var size = req.query.size || config.default_size;
  var def = req.query.default;
  var helm = req.query.hasOwnProperty('helm');
  var start = new Date();
  
  // Prevent app from crashing/freezing
  if (size < config.min_size || size > config.max_size) {
    // "Unprocessable Entity", valid request, but semantically erroneous:
    // https://tools.ietf.org/html/rfc4918#page-78
    res.status(422).send("422 Invalid size");
    return;
  } else if (!helpers.uuid_valid(uuid)) {
    res.status(422).send("422 Invalid UUID");
    return;
  }

  try {
    helpers.get_avatar(uuid, helm, size, function(err, status, image) {
      console.log(uuid + " - " + human_status[status]);
      if (err) {
        console.error(err);
      }
      if (image) {
        sendimage(err ? 503 : 200, status, image);
      } else {
        handle_default(404, status);
      }
    });
  } catch(e) {
    console.error("Error!");
    console.error(e);
    handle_default(500, status);
  }

  function handle_default(http_status, img_status) {
    if (def != "steve" && def != "alex") {
      def = skins.default_skin(uuid);
    }
    skins.resize_img("public/images/" + def + ".png", size, function(err, image) {
      sendimage(http_status, img_status, image);
    });
  }

  function sendimage(http_status, img_status, image) {
    res.writeHead(http_status, {
      'Content-Type': 'image/png',
      'Cache-Control': 'max-age=' + config.browser_cache_time + ', public',
      'Response-Time': new Date() - start,
      'X-Storage-Type': human_status[img_status]
    });
    res.end(image);
  }
});


module.exports = router;