// JanSetu — Civic Reference Data for India
// All 28 states + 8 UTs, departments, and issue catalog.

window.JANSETU_DATA = (() => {
  const STATES = [
    "Andhra Pradesh","Arunachal Pradesh","Assam","Bihar","Chhattisgarh","Goa","Gujarat",
    "Haryana","Himachal Pradesh","Jharkhand","Karnataka","Kerala","Madhya Pradesh",
    "Maharashtra","Manipur","Meghalaya","Mizoram","Nagaland","Odisha","Punjab",
    "Rajasthan","Sikkim","Tamil Nadu","Telangana","Tripura","Uttar Pradesh",
    "Uttarakhand","West Bengal",
    // Union Territories
    "Andaman and Nicobar Islands","Chandigarh","Dadra and Nagar Haveli and Daman and Diu",
    "Delhi","Jammu and Kashmir","Ladakh","Lakshadweep","Puducherry"
  ];

  // Sample districts (a couple per state — extensible).
  const DISTRICTS = {
    "Andhra Pradesh": ["Visakhapatnam","Vijayawada","Guntur","Tirupati","Kurnool"],
    "Arunachal Pradesh": ["Itanagar","Tawang","Pasighat"],
    "Assam": ["Guwahati","Dibrugarh","Silchar","Jorhat"],
    "Bihar": ["Patna","Gaya","Bhagalpur","Muzaffarpur"],
    "Chhattisgarh": ["Raipur","Bhilai","Bilaspur"],
    "Goa": ["Panaji","Margao","Vasco da Gama"],
    "Gujarat": ["Ahmedabad","Surat","Vadodara","Rajkot"],
    "Haryana": ["Gurugram","Faridabad","Panipat","Karnal"],
    "Himachal Pradesh": ["Shimla","Manali","Dharamshala"],
    "Jharkhand": ["Ranchi","Jamshedpur","Dhanbad"],
    "Karnataka": ["Bengaluru","Mysuru","Mangaluru","Hubballi"],
    "Kerala": ["Thiruvananthapuram","Kochi","Kozhikode","Thrissur"],
    "Madhya Pradesh": ["Bhopal","Indore","Gwalior","Jabalpur"],
    "Maharashtra": ["Mumbai","Pune","Nagpur","Nashik","Thane"],
    "Manipur": ["Imphal","Churachandpur"],
    "Meghalaya": ["Shillong","Tura"],
    "Mizoram": ["Aizawl","Lunglei"],
    "Nagaland": ["Kohima","Dimapur"],
    "Odisha": ["Bhubaneswar","Cuttack","Rourkela"],
    "Punjab": ["Ludhiana","Amritsar","Jalandhar","Chandigarh"],
    "Rajasthan": ["Jaipur","Jodhpur","Udaipur","Kota"],
    "Sikkim": ["Gangtok","Namchi"],
    "Tamil Nadu": ["Chennai","Coimbatore","Madurai","Tiruchirappalli","Salem"],
    "Telangana": ["Hyderabad","Warangal","Karimnagar"],
    "Tripura": ["Agartala","Udaipur"],
    "Uttar Pradesh": ["Lucknow","Kanpur","Varanasi","Agra","Noida","Ghaziabad","Prayagraj"],
    "Uttarakhand": ["Dehradun","Haridwar","Nainital"],
    "West Bengal": ["Kolkata","Howrah","Siliguri","Durgapur"],
    "Andaman and Nicobar Islands": ["Port Blair"],
    "Chandigarh": ["Chandigarh"],
    "Dadra and Nagar Haveli and Daman and Diu": ["Daman","Silvassa"],
    "Delhi": ["New Delhi","North Delhi","South Delhi","East Delhi","West Delhi"],
    "Jammu and Kashmir": ["Srinagar","Jammu"],
    "Ladakh": ["Leh","Kargil"],
    "Lakshadweep": ["Kavaratti"],
    "Puducherry": ["Puducherry","Karaikal"]
  };

  // Issue catalog — each issue maps to a department + SLA (hours) + priority weight.
  const CATEGORIES = [
    { id:"roads",       icon:"🛣️", name:"Roads & Potholes",       dept:"Public Works Department (PWD)",            sla:72,  priority:"high"   },
    { id:"streetlight", icon:"💡", name:"Streetlight Failure",     dept:"Municipal Electrical Wing",                 sla:48,  priority:"medium" },
    { id:"garbage",     icon:"🗑️", name:"Garbage / Trash Overflow",dept:"Solid Waste Management (Municipality)",     sla:24,  priority:"high"   },
    { id:"water",       icon:"🚰", name:"Water Supply Issue",      dept:"Jal Board / PHED",                          sla:24,  priority:"critical"},
    { id:"drainage",    icon:"🌊", name:"Drainage / Sewage",       dept:"Sewerage & Drainage Board",                 sla:48,  priority:"high"   },
    { id:"power",       icon:"⚡", name:"Power Outage",            dept:"State Electricity Board (DISCOM)",          sla:12,  priority:"critical"},
    { id:"sanitation",  icon:"🧹", name:"Public Sanitation",       dept:"Health & Sanitation Dept.",                 sla:48,  priority:"medium" },
    { id:"stray",       icon:"🐕", name:"Stray Animal Menace",     dept:"Animal Husbandry / Municipal Vet",          sla:72,  priority:"medium" },
    { id:"traffic",     icon:"🚦", name:"Traffic Signal Issue",    dept:"Traffic Police / Transport Dept.",          sla:24,  priority:"high"   },
    { id:"encroach",    icon:"🏚️", name:"Encroachment",            dept:"Town Planning / Revenue Dept.",             sla:168, priority:"low"    },
    { id:"pollution",   icon:"🏭", name:"Pollution (Air/Water)",   dept:"State Pollution Control Board",             sla:96,  priority:"high"   },
    { id:"noise",       icon:"🔊", name:"Noise Pollution",         dept:"Police / Pollution Control Board",          sla:48,  priority:"medium" },
    { id:"park",        icon:"🌳", name:"Parks & Greenery",        dept:"Horticulture Dept.",                        sla:120, priority:"low"    },
    { id:"school",      icon:"🏫", name:"Govt. School Issue",      dept:"Dept. of School Education",                 sla:120, priority:"medium" },
    { id:"health",      icon:"🏥", name:"PHC / Health Centre",     dept:"Dept. of Health & Family Welfare",          sla:48,  priority:"high"   },
    { id:"transport",   icon:"🚌", name:"Public Transport",        dept:"State Road Transport Corporation",          sla:96,  priority:"medium" },
    { id:"safety",      icon:"🚨", name:"Public Safety / Crime",   dept:"State Police",                              sla:6,   priority:"critical"},
    { id:"women",       icon:"🚺", name:"Women Safety",            dept:"Women & Child Welfare + Police",            sla:6,   priority:"critical"},
    { id:"corruption",  icon:"⚖️", name:"Corruption / Bribery",    dept:"Lokayukta / Anti-Corruption Bureau",        sla:240, priority:"high"   },
    { id:"property",    icon:"📜", name:"Property / Revenue",      dept:"Revenue Dept. (Tehsildar)",                 sla:240, priority:"low"    },
    { id:"ration",      icon:"🌾", name:"PDS / Ration Shop",       dept:"Food & Civil Supplies Dept.",               sla:96,  priority:"high"   },
    { id:"agri",        icon:"🚜", name:"Agriculture / Crop Loss", dept:"Dept. of Agriculture",                      sla:120, priority:"medium" },
    { id:"flood",       icon:"🌧️", name:"Flood / Disaster",        dept:"State Disaster Management Authority",       sla:3,   priority:"critical"},
    { id:"fire",        icon:"🔥", name:"Fire Hazard",             dept:"Fire & Emergency Services",                 sla:1,   priority:"critical"},
    { id:"other",       icon:"📌", name:"Other Civic Issue",       dept:"District Collectorate (Grievance Cell)",    sla:120, priority:"low"    }
  ];

  const PRIORITY_COLORS = {
    critical: "#ef4444",
    high:     "#f59e0b",
    medium:   "#3b82f6",
    low:      "#10b981"
  };

  const STATUSES = ["Submitted","Acknowledged","In Progress","Resolved","Rejected"];

  return { STATES, DISTRICTS, CATEGORIES, PRIORITY_COLORS, STATUSES };
})();
