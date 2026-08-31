MSMEComponentFactories.roster({ id:'entrepreneurs', view:'entrepreneurs', label:'Entrepreneur', heading:'ENTREPRENEUR OPERATIONS',
  records:()=>typeof people==='undefined'?[]:people.filter(person=>person.role==='Entrepreneur'), rowSelector:'[data-attendance]', addSelector:'#add-person' });
