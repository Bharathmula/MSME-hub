MSMEComponentFactories.roster({ id:'staff', view:'staff', label:'Staff', heading:'STAFF OPERATIONS',
  records:()=>typeof people==='undefined'?[]:people.filter(person=>person.role==='Staff'), rowSelector:'[data-attendance]', addSelector:'#add-person' });
