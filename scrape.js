var io = require('indian-ocean')
var cheerio = require('cheerio')
var fs = require('fs')
var request = require('request');
var _ = require('underscore')
var data = []
var chalk = require('chalk')
var queue = require('queue-async')

// read the names and links for all candidates on the local elections page

var linklist = io.readDataSync('data/processed_data/candidatelist.csv')
var urls = _.pluck(linklist,'link')

// rate limiting functions (la..la..la)

_.rateLimit = function(func, rate, async) {
  var queue = [];
  var timeOutRef = false;
  var currentlyEmptyingQueue = false;
  
  var emptyQueue = function() {
    if (queue.length) {
      currentlyEmptyingQueue = true;
      _.delay(function() {
        if (async) {
          _.defer(function() { queue.shift().call(); });
        } else {
          queue.shift().call();
        }
        emptyQueue();
      }, rate);
    } else {
      currentlyEmptyingQueue = false;
    }
  };
  
  return function() {
    var args = _.map(arguments, function(e) { return e; }); // get arguments into an array
    queue.push( _.bind.apply(this, [func, this].concat(args)) ); // call apply so that we can pass in arguments as parameters as opposed to an array
    if (!currentlyEmptyingQueue) { emptyQueue(); }
  };
};

// The number to queue is how many requests it can handle in parallel 
// If only want one to start after the previous request has finished, set this to `1`.
var q = queue(50);

// Make a rate limited version of our requesting function, this will only call it once every 5 seconds
// but unlike throttle or debounce, it will put our requests into a line up so it will always execute every function given to it.
var makeRequest_limited = _.rateLimit(makeRequest, 400)

urls.forEach(function(url){
  // Add each request to the main queue
  q.defer(makeRequest_limited, url);
});

// The function we do when we're all done
q.awaitAll(function(err, bodies){
  console.log(chalk.green('All done!'));
  console.log(bodies.length, 'pages available');
  io.writeDataSync('data/processed_data/candidate_cycles.csv', data);
});

function makeRequest(url, cb){
  // You could delay each request but wrapping it in a setTimeout, but using the rateLimit extension above is a nicer solution
  // setTimeout(function(){
    console.log(chalk.cyan('Requesting...'), url);

    request('http://www.pbcelections.org/'+url, function(err, response, body){

      if (!err && response.statusCode == 200){
        var $ = cheerio.load(body);
        var $rows = $('tr');        
        $rows.each(function(index, row){
        	var obj = {}
        	var $cells = $(row).find('td');
            $cells.each(function(index,cell){
            	var name = $(cell).attr('class')
            	obj[name] = $(cell).text()
            	if (($(cell).find('a')).attr('href')){
            		obj.electionlink = ($(cell).find('a')).attr('href')
            	}
            	var key = _.findWhere(linklist,{'link':url})
            	_.extend(obj,key)
            });
		if (!_.isEmpty(obj)){
			data.push(obj)
		}
		});

        cb(null, body);
      } else {
        cb(err);
      }
    });
}