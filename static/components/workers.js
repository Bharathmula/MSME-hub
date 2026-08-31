MSMEComponentFactories.roster({ id:'workers', view:'workers', label:'Workers', heading:'WORKER OPERATIONS',
  records:()=>typeof people==='undefined'?[]:people.filter(person=>person.role==='Worker'), rowSelector:'[data-attendance]', addSelector:'#add-person' });
