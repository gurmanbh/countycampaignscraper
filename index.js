var io = require('indian-ocean')
var cheerio = require('cheerio')
var request = require('request');
var data = []

request('http://www.pbcelections.org/CFCandidates.aspx', function(err, response, body){
	if (!err & response.statusCode == 200){
		var $ = cheerio.load(body);
		var $table = $('table');
		var $rows = $table.find('tr')
		$rows.each(function(index, row){
        	var $cells = $(row).find('td');
        	
            $cells.each(function(index,cell){
            	var obj = {}
            	obj.lastname = $(cell).text().split(',')[0]
            	obj.firstname = $(cell).text().split(',')[1].trim()
            	obj.link = $($(cell).find('a')).attr('href')
            	obj.id = obj.link.split('?cand_id=')[1]
            	data.push(obj)
            });
		});
	io.writeDataSync('data/processed_data/candidatelist.csv',data)
	} else {
		console.log('error')
	}
});

// request(url).pipe(fs.createWriteStream('data/files/'+e.lastname+'_'+e.firstname+'_'+e.cycledate+'.csv'))
