MSMEComponentFactories.standard({ id:'reminders', view:'reminders', label:'Reminders', heading:'SMART NOTIFICATIONS', required:[
  {name:'Reminder content',selector:'.panel'},
  {name:'Reminder count badge',selector:'#reminder-count'}
]});
