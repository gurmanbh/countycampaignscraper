var io = require('indian-ocean')
var _ = require('underscore')
var scrapetypes = ['Contributions','Expenditures','FundTransfers','Distributions']

var data = io.readDataSync('data/processed_data/candidate_cycles_withcsvlinks.csv')
var todaydate = (new Date()).toString().split(' ').splice(1,3).join('')
function cleandate(e){
  return e.replace(/\//g,'')
}

scrapetypes.forEach(function(type){
	var total = []
	data.forEach(function(e){
	if (e.csvstatus=='Y'){
		var file = io.readDataSync('data/files/'+type+'/'+e.lastname+'_'+e.firstname+'_'+cleandate(e.CycleDate)+'.csv')
		file.forEach(function(d){
			d.CycleDate = e.CycleDate
			d.candidatelastname = e.lastname
			d.candidatefirstname = e.firstname
			d.candidateid = e.id
			d.CycleName = e.CycleName
			d.OfficeTitle = e.OfficeTitle
			delete d[''];
			if (d.State!='State'){
				total.push(d)
			}
		})
	}
	})

	io.writeDataSync('data/combined_file/'+type+todaydate+'.csv',total)
})



