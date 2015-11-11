var io = require('indian-ocean')
var _ = require('underscore')

var data = io.readDataSync('data/processed_data/candidate_cycles_withcsvlink.csv')
var total = []
data.forEach(function(e){
	if (e.istherefunding=='Y'){
		var file = io.readDataSync('data/files/'+e.lastname+'_'+e.firstname+'_'+cleandate(e.CycleDate)+'.csv')
		file.forEach(function(d){
			d.CycleDate = e.CycleDate
			d.candidatelastname = e.lastname
			d.candidatefirstname = e.firstname
			d.candidateid = e.id
			d.CycleName = e.CycleName
			d.OfficeTitle = e.OfficeTitle
			delete d[''];
			if (d.ContributionDate!='ContributionDate'){
				total.push(d)
			}
		})
	}
})

function cleandate(e){
  return e.replace(/\//g,'')
}

io.writeDataSync('data/combined_file/data.csv',total)