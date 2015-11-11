var io = require('indian-ocean')
var cheerio = require('cheerio')
var fs = require('fs')
var request = require('request');
var _ = require('underscore')
var data = []
var chalk = require('chalk')
var queue = require('queue-async')
var scrapetypes = ['Contributions','Expenditures','FundTransfers','Distributions']
var candidate_cycles = io.readDataSync('data/processed_data/candidate_cycles.csv')
var urls = _.pluck(candidate_cycles,'electionlink')
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
var makeRequest_limited = _.rateLimit(makeRequest, 500)

urls.forEach(function(url){
  // Add each request to the main queue
  q.defer(makeRequest_limited, url);
});

// The function we do when we're all done
q.awaitAll(function(err, bodies){
  console.log(chalk.green('All done!'));
  console.log(bodies.length, 'pages available');
  io.writeDataSync('data/processed_data/candidate_cycles_withcsvlinks.csv', data);
});

function makeRequest(url, cb){
  // You could delay each request but wrapping it in a setTimeout, but using the rateLimit extension above is a nicer solution
  // setTimeout(function(){
    console.log(chalk.cyan('Requesting...'), url);

    request('http://www.pbcelections.org/'+url, function(err, response, body){

      if (!err && response.statusCode == 200){
        var $ = cheerio.load(body);
        var key = _.findWhere(candidate_cycles,{'electionlink':url})
        scrapetypes.forEach(function(e){
           key[e+'_link'] = $('#lnk'+e+'CSV').attr('href');
            if (key[e+'_link']){
              downloadcsv(key,e)
            }
        })

        // in some cases there is a link, but no funding. Hence, no csv to download is available
       
        data.push(key)
        cb(null, body);
      } else {
        cb(err);
      }
    });
}

function cleandate(e){
  return e.replace(/\//g,'')
}

function downloadcsv(key,e){
  request('http://www.pbcelections.org/'+key[e+'_link']).pipe(fs.createWriteStream('data/files/'+e+'/'+key.lastname+'_'+key.firstname+'_'+cleandate(key.CycleDate)+'.csv'))
}