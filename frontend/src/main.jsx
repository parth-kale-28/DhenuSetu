import React, { useEffect, useMemo, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  RecaptchaVerifier,
  signInWithPhoneNumber,
  sendEmailVerification,
  sendPasswordResetEmail,
} from "firebase/auth";
import {
  collection,
  doc,
  query,
  where,
  onSnapshot,
  updateDoc,
  writeBatch,
  addDoc,
  setDoc,
} from "firebase/firestore";
import { auth, db, firebaseConfigured } from "./firebase.js";
import {
  ensureProfile,
  getProfile,
  findPublicProfileById,
  users,
  findUser,
  animalsFor,
  connections,
  isConnected,
  connectionPairsFor,
  pendingFor,
  vetRecordsFor,
  labReportsFor,
  messagesFor,
  farmEnvironmentFor,
  saveAnimal,
  removeAnimal,
  saveEnvironment,
  sendConnection,
  decideConnection,
  saveVetRecord,
  saveLabReport,
  updateLabReport,
  sendMessage,
  updateUserProfile,
  recordAnimalDailyObservation,
  startLiveSync,
  useCloudVersion,
  currentCache,
  profileId,
} from "./store.js";
import { apiFetch, aiChat, dispatchNotification } from "./api.js";
import { uploadToCloudinary } from "./media.js";
import {
  registerPushNotifications,
  listenForegroundNotifications,
  disablePushNotifications,
} from "./notifications.js";
import { exportCsv, riskFromAnimal, friendlyError } from "./utils.js";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  AreaChart,
  Area,
  Cell,
} from "recharts";
import "./styles.css";

const COW_IMG =
  "https://upload.wikimedia.org/wikipedia/commons/thumb/6/65/Indian_Cow.jpg/960px-Indian_Cow.jpg";
const APP_EMAIL = "dhenusetu@gmail.com";
const LANGUAGES = [
  "English",
  "Hindi",
  "Marathi",
  "Gujarati",
  "Bengali",
  "Tamil",
  "Telugu",
  "Kannada",
  "Malayalam",
  "Punjabi",
  "Odia",
  "Urdu",
];
const LANGUAGE_CODES = {
  English: "en-IN",
  Hindi: "hi-IN",
  Marathi: "mr-IN",
  Gujarati: "gu-IN",
  Bengali: "bn-IN",
  Tamil: "ta-IN",
  Telugu: "te-IN",
  Kannada: "kn-IN",
  Malayalam: "ml-IN",
  Punjabi: "pa-IN",
  Odia: "or-IN",
  Urdu: "ur-IN",
};

const BREEDS = {
  Cow: {
    Sahiwal: {
      type: "Indigenous dairy breed",
      traits: "Hardy, heat tolerant, good dairy performance.",
    },
    Gir: {
      type: "Indigenous dairy breed",
      traits: "Hardy and dairy-focused indigenous breed.",
    },
    "Red Sindhi": {
      type: "Indigenous dairy breed",
      traits: "Hardy, adaptable and dairy-oriented.",
    },
    Tharparkar: {
      type: "Indigenous dual-purpose breed",
      traits: "Hardy and adaptable to varied conditions.",
    },
    "HF Cross": {
      type: "Crossbred dairy cattle",
      traits: "High-yield dairy cross; heat-stress monitoring is important.",
    },
    "Jersey Cross": {
      type: "Crossbred dairy cattle",
      traits: "Dairy cross with good production and adaptability.",
    },
  },
  Buffalo: {
    Murrah: {
      type: "Dairy buffalo breed",
      traits: "High-yield dairy buffalo with strong milk-fat characteristics.",
    },
    Jaffarabadi: {
      type: "Dairy buffalo breed",
      traits: "Large dairy buffalo breed with good milk potential.",
    },
    Mehsana: {
      type: "Dairy buffalo breed",
      traits: "Hardy dairy buffalo breed with good adaptation.",
    },
    Surti: {
      type: "Dairy buffalo breed",
      traits: "Medium-sized dairy buffalo with good adaptation.",
    },
    "Nili-Ravi": {
      type: "Dairy buffalo breed",
      traits:
        "Dairy-focused buffalo breed with strong milk production characteristics.",
    },
  },
};
const breedOptions = (s) => Object.keys(BREEDS[s] || {});
const breedProfile = (a) => (BREEDS[a?.species] || {})[a?.breed];

const T = {
  English: {
    brand: "DhenuSetu",
    tagline: "Dairy health & early warning",
    login: "Login",
    register: "Register",
    farmer: "Farmer",
    vet: "Veterinarian",
    chooseRole: "Choose account type",
    email: "Email address",
    phone: "Mobile number",
    password: "Password",
    confirm: "Confirm password",
    name: "Name",
    farm: "Farm name",
    license: "Registration / license number",
    clinic: "Clinic / hospital",
    create: "Create account",
    overview: "Overview",
    myFarm: "My Farm",
    animals: "Animals",
    milk: "Milk & Quantity",
    health: "Health Records",
    environment: "Environment",
    risk: "Mastitis Risk",
    vetSection: "Veterinarian",
    labReports: "Lab Reports",
    alerts: "Alerts",
    reports: "Reports",
    profile: "Profile",
    logout: "Sign out",
    add: "Add animal",
    edit: "Edit",
    remove: "Remove",
    details: "View details",
    save: "Save",
    cancel: "Cancel",
    back: "Back",
    search: "Search",
    export: "Export CSV",
    language: "Language",
    welcome: "Welcome back",
    subtitle: "Monitor your herd and act early.",
    forecast: "7–14 day early warning",
    mastitis: "Mastitis risk",
    total: "Total herd",
    cows: "Cows",
    buffaloes: "Buffaloes",
    high: "High risk",
    moderate: "Moderate risk",
    monitored: "Monitored animals",
    animalName: "Animal name",
    animalId: "Animal ID / Tag",
    animalType: "Animal type",
    breed: "Breed",
    age: "Age (years)",
    lactation: "Lactation number",
    milkYield: "Milk yield (L/day)",
    scc: "SCC (thousand cells/mL)",
    temp: "Body temperature (°C)",
    conductivity: "Milk conductivity",
    ph: "Milk pH",
    activity: "Activity",
    rumination: "Rumination",
    insufficient: "Insufficient Data",
    noRecords: "No records yet.",
    medicalHistory: "Medical history",
    vaccinations: "Vaccinations",
    diseases: "Previous / specific diseases",
    vaccination: "Vaccination",
    disease: "Disease / condition",
    status: "Status",
    date: "Date",
    certificate: "Vaccination certificate",
    upload: "Upload",
    capture: "Capture realtime photo",
    noMedicalHistory: "No medical history recorded.",
    hygiene: "Hygiene",
    environmentReport: "Environment report",
    sharedEnvironment: "Shared farm environment",
    shed: "Shed / housing",
    feed: "Feed / fodder",
    milkingArea: "Milking area",
    water: "Water / drinking",
    ambientTemp: "Ambient temperature",
    humidity: "Humidity",
    housing: "Housing",
    lab: "Lab report",
    liveTracking: "Live report tracking",
    testName: "Test name",
    labName: "Laboratory name",
    sampleDate: "Sample date",
    result: "Result / observation",
    sendToVet: "Submit lab report",
    connection: "Connections",
    connectVet: "Connect veterinarian",
    connectFarmer: "Connect farmer",
    vetId: "Veterinarian ID",
    farmerId: "Farmer ID",
    sendRequest: "Send connection request",
    approve: "Approve",
    reject: "Reject",
    pending: "Pending",
    connected: "Connected",
    messages: "Messages",
    message: "Message",
    messagePlaceholder: "Write a message...",
    send: "Send",
    instructions: "Instructions",
    prescription: "Prescription",
    veterinaryReports: "Veterinary report",
    saveRecord: "Save record",
    recommendations: "Veterinarian recommendations",
    deviceId: "ESP32 Hardware ID",
    pairHardware: "Pair ESP32 with animal",
    unpair: "Unpair hardware",
    paired: "Paired",
    hardware: "Hardware pairing",
    notifications: "Notifications",
    enableNotifications: "Enable notifications",
    assistant: "DhenuSetu Assistant",
    assistantHint: "Try “Open animals” or ask a dairy-health question.",
    online: "Online",
    offline: "Offline",
    syncing: "Syncing",
    ai: "AI Assistant",
    camera: "Camera",
    permission: "Permission required",
    noVet: "No connected veterinarian yet.",
    noFarmers: "No connected farmers yet.",
    noLab: "No lab reports yet.",
    noMessages: "No messages yet.",
    downloadFarm: "Download farm CSV",
    downloadAnimal: "Download animal CSV",
    downloadFarmer: "Download farmer CSV",
    riskHigh: "High-risk animal needs prompt attention.",
    riskModerate: "Moderate-risk animal needs closer monitoring.",
    riskLow: "Continue routine monitoring.",
    health: "Health",
    farmers: "Farmers",
    farm: "Farm",
    allAnimals: "All animals",
    farms: "Farms",
    milking: "Milking",
    healthSummary: "Animal health summary",
    notes: "Notes",
    modelInputs: "Health and sensor inputs",
    updateToday: "Update today’s info",
    milkToday: "Today’s milk",
    milkAverage: "7-day average",
    dailyEntry: "Daily health & sensor data",
    manualEntry: "Manual entry until ESP32 is connected",
    closureReview: "Doctor review / report closure note",
    closurePlaceholder:
      "Add the final report observation, review or guidance before closing the report.",
    closeReport: "Close report",
    doctorReview: "Doctor review",
    noDataForPeriod: "No data recorded for this period.",
    requestSent: "Request sent",
    connectionSecurity:
      "Connections become active only after recipient approval.",
    insufficientNew:
      "New animals show Insufficient Data until required sensor readings are available.",
    uploadImage: "Upload image",
    removeAttachment: "Remove image",
    labStatus: "Lab status",
    sampleCollected: "Sample collected",
    processing: "Processing",
    resultsReady: "Results ready",
    reviewed: "Reviewed",
    submitted: "Submitted",
    account: "Account",
    personal: "Personal details",
    role: "Account role",
    location: "Location",
    state: "State",
    district: "District",
    village: "Village",
    chooseAnimal: "Choose animal",
    noAlerts: "No active alerts",
    recent: "Recent activity",
    riskTrend: "Risk trend",
    milkTrend: "Milk yield trend",
    sccTrend: "SCC trend",
    tempTrend: "Temperature trend",
    reportCharts: "Charts & trends",
    animalStats: "Animal statistics",
    breedCharacteristics: "Breed characteristics",
    breedType: "Breed type",
    breedTraits: "Key characteristics",
    validBreeds: "Valid breeds",
    invalidBreed: "Select a valid breed for the selected animal type.",
    cameraNote:
      "Photos can be captured using the device camera or uploaded from the device.",
    connectionRequests: "Connection requests",
    profileId: "Profile ID",
    live: "Live",
    read: "Read",
    markRead: "Mark all read",
    notificationSent: "Notification sent",
    emailNotifications: "Email notifications",
    pushNotifications: "Push notifications",
    localData: "",
    introTitle: "Smarter dairy health starts early",
    introText:
      "DhenuSetu brings animal records, milk quality, farm conditions and early mastitis risk monitoring into one simple platform.",
    getStarted: "Get started",
    intro1: "Register your farm and animals",
    intro2: "Record milk, health and farm conditions",
    intro3: "Monitor risk and act before problems grow",
    showPassword: "Show password",
    hidePassword: "Hide password",
    forgotPassword: "Forgot password?",
    farmerRegister: "Create farmer account",
    vetRegister: "Create veterinarian account",
    daily: "Daily",
    monthly: "Monthly",
    month: "Month",
    previous: "Previous",
    next: "Next",
    noDataForPeriod: "No recorded data for this period.",
    enableNotifications: "Enable notifications",
    disableNotifications: "Disable notifications",
    notificationsEnabled: "Browser notifications are enabled.",
    notificationsDisabled: "Browser notifications are disabled.",
    manualEntry: "Manual entry until ESP32 is connected",
    messageFrom: "Message from",
    messageTime: "Time",
    logoutDone: "Signed out.",
  },
  Hindi: {
    brand: "धेनुसेतु",
    tagline: "डेयरी स्वास्थ्य और शुरुआती चेतावनी",
    login: "लॉगिन",
    register: "पंजीकरण",
    farmer: "किसान",
    vet: "पशु चिकित्सक",
    chooseRole: "खाता प्रकार चुनें",
    email: "ईमेल",
    phone: "मोबाइल नंबर",
    password: "पासवर्ड",
    confirm: "पासवर्ड की पुष्टि",
    name: "नाम",
    farm: "फार्म का नाम",
    license: "पंजीकरण / लाइसेंस नंबर",
    clinic: "क्लिनिक / अस्पताल",
    create: "खाता बनाएं",
    overview: "डैशबोर्ड",
    myFarm: "मेरा फार्म",
    animals: "पशु",
    milk: "दूध और गुणवत्ता",
    health: "स्वास्थ्य रिकॉर्ड",
    environment: "पर्यावरण",
    risk: "मास्टाइटिस जोखिम",
    vetSection: "पशु चिकित्सक",
    labReports: "लैब रिपोर्ट",
    alerts: "अलर्ट",
    reports: "रिपोर्ट",
    profile: "प्रोफाइल",
    logout: "लॉग आउट",
    add: "पशु जोड़ें",
    edit: "संपादित करें",
    remove: "हटाएं",
    details: "विवरण देखें",
    save: "सहेजें",
    cancel: "रद्द करें",
    back: "वापस",
    search: "खोजें",
    export: "CSV डाउनलोड",
    language: "भाषा",
    welcome: "वापसी पर स्वागत है",
    subtitle: "अपने पशुओं पर निगरानी रखें और समय पर कार्रवाई करें।",
    forecast: "7–14 दिन की शुरुआती चेतावनी",
    total: "कुल पशु",
    cows: "गाय",
    buffaloes: "भैंस",
    high: "उच्च जोखिम",
    moderate: "मध्यम जोखिम",
    monitored: "निगरानी में पशु",
    animalName: "पशु का नाम",
    animalId: "पशु ID / टैग",
    animalType: "पशु प्रकार",
    breed: "नस्ल",
    age: "उम्र",
    lactation: "लैक्टेशन नंबर",
    milkYield: "दूध उत्पादन (ली./दिन)",
    scc: "SCC",
    temp: "शरीर का तापमान (°C)",
    conductivity: "दूध चालकता",
    ph: "दूध pH",
    activity: "गतिविधि",
    rumination: "जुगाली",
    insufficient: "अपर्याप्त डेटा",
    medicalHistory: "चिकित्सीय इतिहास",
    vaccinations: "टीकाकरण",
    diseases: "पिछली / विशेष बीमारियाँ",
    vaccination: "टीका",
    disease: "बीमारी / स्थिति",
    status: "स्थिति",
    date: "तारीख",
    certificate: "टीकाकरण प्रमाणपत्र",
    upload: "अपलोड",
    capture: "कैमरा से फोटो",
    noMedicalHistory: "कोई चिकित्सीय इतिहास नहीं।",
    hygiene: "स्वच्छता",
    environmentReport: "पर्यावरण रिपोर्ट",
    sharedEnvironment: "साझा फार्म वातावरण",
    shed: "शेड / आवास",
    feed: "चारा",
    milkingArea: "दूध निकालने का क्षेत्र",
    water: "पानी",
    ambientTemp: "परिवेश तापमान",
    humidity: "आर्द्रता",
    housing: "आवास",
    labReports: "लैब रिपोर्ट",
    liveTracking: "लाइव रिपोर्ट ट्रैकिंग",
    testName: "टेस्ट नाम",
    labName: "प्रयोगशाला",
    sampleDate: "नमूना तारीख",
    result: "परिणाम",
    sendToVet: "लैब रिपोर्ट भेजें",
    connectVet: "पशु चिकित्सक से जुड़ें",
    connectFarmer: "किसान से जुड़ें",
    vetId: "पशु चिकित्सक ID",
    farmerId: "किसान ID",
    sendRequest: "कनेक्शन अनुरोध भेजें",
    approve: "स्वीकार करें",
    reject: "अस्वीकार करें",
    pending: "लंबित",
    connected: "जुड़ा हुआ",
    messages: "संदेश",
    message: "संदेश",
    messagePlaceholder: "संदेश लिखें...",
    send: "भेजें",
    instructions: "निर्देश",
    prescription: "प्रिस्क्रिप्शन",
    veterinaryReports: "पशु चिकित्सा रिपोर्ट",
    recommendations: "पशु चिकित्सक की सलाह",
    deviceId: "ESP32 हार्डवेयर ID",
    pairHardware: "ESP32 को पशु से जोड़ें",
    unpair: "हार्डवेयर हटाएं",
    paired: "जुड़ा हुआ",
    hardware: "हार्डवेयर पेयरिंग",
    notifications: "सूचनाएं",
    enableNotifications: "सूचनाएं सक्षम करें",
    assistant: "धेनुसेतु सहायक",
    assistantHint: "“पशु खोलो” कहें या डेयरी स्वास्थ्य प्रश्न पूछें।",
    online: "ऑनलाइन",
    offline: "ऑफलाइन",
    syncing: "सिंक हो रहा है",
    farmers: "किसान",
    allAnimals: "सभी पशु",
    requestSent: "अनुरोध भेजा गया",
    connectionSecurity: "कनेक्शन प्राप्तकर्ता की मंजूरी के बाद सक्रिय होता है.",
    profileId: "प्रोफाइल ID",
    cameraNote: "कैमरा या अपलोड से फोटो जोड़ सकते हैं.",
    noAlerts: "कोई सक्रिय अलर्ट नहीं",
    recent: "हाल की गतिविधि",
    riskTrend: "जोखिम ट्रेंड",
    milkTrend: "दूध उत्पादन ट्रेंड",
    sccTrend: "SCC ट्रेंड",
    tempTrend: "तापमान ट्रेंड",
    reportCharts: "चार्ट और ट्रेंड",
    breedCharacteristics: "नस्ल की विशेषताएं",
    breedType: "नस्ल प्रकार",
    breedTraits: "मुख्य विशेषताएं",
    validBreeds: "मान्य नस्लें",
    invalidBreed: "चयनित पशु प्रकार की मान्य नस्ल चुनें.",
    insufficientNew:
      "नए पशु के लिए सेंसर रीडिंग उपलब्ध होने तक अपर्याप्त डेटा दिखेगा.",
    uploadImage: "छवि अपलोड करें",
    removeAttachment: "छवि हटाएं",
    sampleCollected: "नमूना लिया",
    processing: "प्रोसेसिंग",
    resultsReady: "परिणाम तैयार",
    reviewed: "समीक्षित",
    submitted: "जमा किया",
    labStatus: "लैब स्थिति",
    chooseAnimal: "पशु चुनें",
    account: "खाता",
    personal: "व्यक्तिगत विवरण",
    role: "खाता भूमिका",
    location: "स्थान",
    state: "राज्य",
    district: "जिला",
    village: "गांव",
    getStarted: "शुरू करें",
    introTitle: "स्मार्ट डेयरी स्वास्थ्य समय पर शुरू होता है",
    introText:
      "धेनुसेतु पशु रिकॉर्ड, दूध गुणवत्ता, फार्म स्थितियों और शुरुआती मास्टाइटिस जोखिम को एक मंच पर लाता है.",
    intro1: "फार्म और पशु पंजीकृत करें",
    intro2: "दूध, स्वास्थ्य और फार्म डेटा दर्ज करें",
    intro3: "जोखिम देखें और समय पर कार्रवाई करें",
    showPassword: "पासवर्ड दिखाएं",
    hidePassword: "पासवर्ड छिपाएं",
  },
  Marathi: {
    brand: "धेनुसेतु",
    tagline: "दुग्ध आरोग्य आणि पूर्वसूचना",
    login: "लॉगिन",
    register: "नोंदणी",
    farmer: "शेतकरी",
    vet: "पशुवैद्यक",
    chooseRole: "खाते प्रकार निवडा",
    email: "ईमेल",
    phone: "मोबाइल क्रमांक",
    password: "पासवर्ड",
    confirm: "पासवर्डची पुष्टी",
    name: "नाव",
    farm: "शेताचे नाव",
    license: "नोंदणी / परवाना क्रमांक",
    clinic: "क्लिनिक / रुग्णालय",
    create: "खाते तयार करा",
    overview: "आढावा",
    myFarm: "माझे शेत",
    animals: "पशुधन",
    milk: "दूध आणि गुणवत्ता",
    health: "आरोग्य नोंदी",
    environment: "पर्यावरण",
    risk: "मास्टायटिस धोका",
    vetSection: "पशुवैद्यक",
    labReports: "प्रयोगशाळा अहवाल",
    alerts: "सूचना",
    reports: "अहवाल",
    profile: "प्रोफाइल",
    logout: "बाहेर पडा",
    add: "पशु जोडा",
    edit: "संपादित करा",
    remove: "काढा",
    details: "तपशील",
    save: "जतन करा",
    cancel: "रद्द करा",
    back: "मागे",
    search: "शोधा",
    export: "CSV डाउनलोड",
    language: "भाषा",
    welcome: "पुन्हा स्वागत",
    subtitle: "कळपावर लक्ष ठेवा आणि वेळेवर कृती करा.",
    forecast: "7–14 दिवसांची पूर्वसूचना",
    total: "एकूण पशुधन",
    cows: "गायी",
    buffaloes: "म्हशी",
    high: "उच्च धोका",
    moderate: "मध्यम धोका",
    monitored: "निगराणीतील पशु",
    animalName: "पशुचे नाव",
    animalId: "पशु ID / टॅग",
    animalType: "पशु प्रकार",
    breed: "जात",
    age: "वय",
    lactation: "लॅक्टेशन क्रमांक",
    milkYield: "दूध उत्पादन",
    scc: "SCC",
    temp: "शरीर तापमान (°C)",
    conductivity: "दूध चालकता",
    ph: "दूध pH",
    activity: "हालचाल",
    rumination: "रवंथ",
    insufficient: "अपुरा डेटा",
    medicalHistory: "वैद्यकीय इतिहास",
    vaccinations: "लसीकरण",
    diseases: "मागील / विशिष्ट आजार",
    vaccination: "लस",
    disease: "आजार / स्थिती",
    status: "स्थिती",
    date: "तारीख",
    certificate: "लसीकरण प्रमाणपत्र",
    upload: "अपलोड",
    capture: "कॅमेरा फोटो",
    noMedicalHistory: "वैद्यकीय इतिहास नाही.",
    hygiene: "स्वच्छता",
    environmentReport: "पर्यावरण अहवाल",
    sharedEnvironment: "सामायिक शेत वातावरण",
    shed: "गोठा / शेड",
    feed: "चारा",
    milkingArea: "दूध काढण्याचे क्षेत्र",
    water: "पाणी",
    ambientTemp: "पर्यावरण तापमान",
    humidity: "आर्द्रता",
    housing: "निवास",
    labReports: "लॅब अहवाल",
    liveTracking: "लाइव्ह अहवाल ट्रॅकिंग",
    testName: "चाचणी",
    labName: "प्रयोगशाळा",
    sampleDate: "नमुना तारीख",
    result: "निकाल",
    sendToVet: "लॅब अहवाल पाठवा",
    connectVet: "पशुवैद्यक जोडणी",
    connectFarmer: "शेतकरी जोडणी",
    vetId: "पशुवैद्यक ID",
    farmerId: "शेतकरी ID",
    sendRequest: "जोडणी विनंती पाठवा",
    approve: "स्वीकारा",
    reject: "नकारा",
    pending: "प्रलंबित",
    connected: "जोडलेले",
    messages: "संदेश",
    message: "संदेश",
    messagePlaceholder: "संदेश लिहा...",
    send: "पाठवा",
    instructions: "सूचना",
    prescription: "प्रिस्क्रिप्शन",
    veterinaryReports: "पशुवैद्यकीय अहवाल",
    recommendations: "पशुवैद्यक सूचना",
    deviceId: "ESP32 हार्डवेअर ID",
    pairHardware: "ESP32 पशुशी जोडा",
    unpair: "हार्डवेअर काढा",
    paired: "जोडलेले",
    hardware: "हार्डवेअर पेअरिंग",
    notifications: "सूचना",
    enableNotifications: "सूचना सक्षम करा",
    assistant: "धेनुसेतु सहाय्यक",
    assistantHint: "“पशु उघडा” म्हणा किंवा डेअरी आरोग्य प्रश्न विचारा.",
    online: "ऑनलाइन",
    offline: "ऑफलाइन",
    syncing: "सिंक होत आहे",
    farmers: "शेतकरी",
    allAnimals: "सर्व पशु",
    requestSent: "विनंती पाठवली",
    connectionSecurity: "कनेक्शन प्राप्तकर्त्याच्या मंजुरीनंतर सक्रिय होते.",
    profileId: "प्रोफाइल ID",
    cameraNote: "कॅमेरा किंवा अपलोडने फोटो जोडा.",
    noAlerts: "सक्रिय सूचना नाहीत",
    recent: "अलीकडील हालचाल",
    riskTrend: "धोका ट्रेंड",
    milkTrend: "दूध ट्रेंड",
    sccTrend: "SCC ट्रेंड",
    tempTrend: "तापमान ट्रेंड",
    reportCharts: "चार्ट आणि ट्रेंड",
    breedCharacteristics: "जातीची वैशिष्ट्ये",
    breedType: "जातीचा प्रकार",
    breedTraits: "मुख्य वैशिष्ट्ये",
    validBreeds: "वैध जाती",
    invalidBreed: "निवडलेल्या पशु प्रकाराची वैध जात निवडा.",
    insufficientNew: "सेंसर वाचन उपलब्ध होईपर्यंत नवीन पशूसाठी अपुरा डेटा.",
    uploadImage: "प्रतिमा अपलोड करा",
    removeAttachment: "प्रतिमा काढा",
    sampleCollected: "नमुना घेतला",
    processing: "प्रक्रिया",
    resultsReady: "निकाल तयार",
    reviewed: "तपासले",
    submitted: "सादर",
    labStatus: "लॅब स्थिती",
    chooseAnimal: "पशु निवडा",
    account: "खाते",
    personal: "वैयक्तिक तपशील",
    role: "खाते भूमिका",
    location: "स्थान",
    state: "राज्य",
    district: "जिल्हा",
    village: "गाव",
    getStarted: "सुरू करा",
    introTitle: "स्मार्ट दुग्ध आरोग्य वेळेवर सुरू होते",
    introText:
      "धेनुसेतु पशु नोंदी, दूध गुणवत्ता, शेत परिस्थिती आणि लवकर मास्टायटिस धोका एका प्लॅटफॉर्मवर आणते.",
    intro1: "शेत आणि पशु नोंदणी करा",
    intro2: "दूध, आरोग्य आणि शेत डेटा नोंदवा",
    intro3: "धोका पाहा आणि कृती करा",
    showPassword: "पासवर्ड दाखवा",
    hidePassword: "पासवर्ड लपवा",
  },
};
for (const l of LANGUAGES) {
  if (!T[l]) T[l] = { ...T.English };
  else T[l] = { ...T.English, ...T[l] };
}

function useI18n() {
  const [lang, setLang] = useState("English");
  const t = (k) => T[lang]?.[k] || T.English[k] || k;
  return { lang, t, change: setLang, code: LANGUAGE_CODES[lang] || "en-IN" };
}
function Brand() {
  return (
    <div className="brand">
      <img
        className="brand-mark brand-logo-image"
        src="/dhenusetu-logo-emblem.png"
        alt="DhenuSetu"
      />
      <div>
        <strong>{T.English.brand}</strong>
      </div>
    </div>
  );
}
function Language({ lang, change, t }) {
  return (
    <label className="lang-control">
      <span>文</span>
      <select
        value={lang}
        onChange={(e) => change(e.target.value)}
        aria-label={t("language")}
      >
        {LANGUAGES.map((x) => (
          <option key={x}>{x}</option>
        ))}
      </select>
    </label>
  );
}
function PasswordField({ label, value, onChange, t, required = true }) {
  const [show, setShow] = useState(false);
  return (
    <div className="field">
      <label>{label}</label>
      <div className="password-wrap">
        <input
          type={show ? "text" : "password"}
          value={value}
          onChange={onChange}
          required={required}
        />
        <button
          type="button"
          className="eye"
          onClick={() => setShow((v) => !v)}
          aria-label={show ? t("hidePassword") : t("showPassword")}
        >
          {show ? "👁" : "◉"}
        </button>
      </div>
    </div>
  );
}
function CameraCapture({ t, onDone, label }) {
  const [open, setOpen] = useState(false),
    [stream, setStream] = useState(null),
    [error, setError] = useState("");
  const video = useRef(null);
  const start = async () => {
    setError("");
    try {
      const s = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
        audio: false,
      });
      setStream(s);
      setOpen(true);
      setTimeout(() => {
        if (video.current) {
          video.current.srcObject = s;
          video.current.play().catch(() => {});
        }
      }, 50);
    } catch {
      setError("Camera permission was denied or the camera is unavailable.");
    }
  };
  const stop = () => {
    stream?.getTracks().forEach((x) => x.stop());
    setStream(null);
    setOpen(false);
  };
  const capture = () => {
    const v = video.current,
      c = document.createElement("canvas");
    c.width = v.videoWidth || 640;
    c.height = v.videoHeight || 480;
    c.getContext("2d").drawImage(v, 0, 0, c.width, c.height);
    onDone(c.toDataURL("image/jpeg", 0.86));
    stop();
  };
  return (
    <>
      <button type="button" className="outline small" onClick={start}>
        ◉ {label || t("capture")}
      </button>
      {open && (
        <div className="camera-modal">
          <div className="camera-card">
            <video ref={video} playsInline muted />
            <div className="camera-actions">
              <button type="button" className="primary" onClick={capture}>
                {t("capture")}
              </button>
              <button type="button" className="outline" onClick={stop}>
                {t("cancel")}
              </button>
            </div>
          </div>
        </div>
      )}
      {error && <div className="error compact">{error}</div>}
    </>
  );
}
async function uploadFileToCloud(file, folder) {
  return uploadToCloudinary(file, folder);
}
function ImageInput({ t, label, onUploaded, folder }) {
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const file = async (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setBusy(true);
    setError("");
    try {
      onUploaded(await uploadFileToCloud(f, folder));
    } catch (err) {
      setError(friendlyError(err));
    } finally {
      setBusy(false);
    }
  };
  const capture = async (data) => {
    setBusy(true);
    setError("");
    try {
      onUploaded(await uploadFileToCloud(dataUrlToFile(data), folder));
    } catch (err) {
      setError(friendlyError(err));
    } finally {
      setBusy(false);
    }
  };
  return (
    <div>
      {
        <div className="image-actions">
          <label className="upload-btn">
            ＋ {label || t("upload")}
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp"
              onChange={file}
            />
          </label>
          <CameraCapture t={t} onDone={capture} />
          {busy && <span className="muted">Uploading…</span>}
        </div>
      }
      {error && <div className="error compact">{error}</div>}
    </div>
  );
}
function dataUrlToFile(dataUrl, name = "capture.jpg") {
  const [meta, raw] = dataUrl.split(",");
  const mime = (meta.match(/data:(.*?);base64/) || [])[1] || "image/jpeg";
  const b = atob(raw),
    a = new Uint8Array(b.length);
  for (let i = 0; i < b.length; i++) a[i] = b.charCodeAt(i);
  return new File([a], name, { type: mime });
}

function Intro({ onContinue }) {
  const { t, lang, change } = useI18n();
  return (
    <div className="intro">
      <div
        className="intro-photo"
        style={{ backgroundImage: `url(${COW_IMG})` }}
      >
        <div className="photo-credit">DhenuSetu</div>
      </div>
      <div className="intro-panel">
        <div className="topbar">
          <Brand />
          <Language lang={lang} change={change} t={t} />
        </div>
        <div className="intro-content">
          <span className="eyebrow">{t("tagline")}</span>
          <h1>{t("introTitle")}</h1>
          <p>{t("introText")}</p>
          <div className="intro-steps">
            <div>
              <b>01</b>
              <span>{t("intro1")}</span>
            </div>
            <div>
              <b>02</b>
              <span>{t("intro2")}</span>
            </div>
            <div>
              <b>03</b>
              <span>{t("intro3")}</span>
            </div>
          </div>
          <button className="primary big" onClick={onContinue}>
            {t("getStarted")} <span>→</span>
          </button>
        </div>
      </div>
    </div>
  );
}

function Auth({ onLogin }) {
  const { t, lang, change } = useI18n();
  const [role, setRole] = useState("Farmer"),
    [mode, setMode] = useState("login"),
    [method, setMethod] = useState("email"),
    [email, setEmail] = useState(""),
    [phone, setPhone] = useState(""),
    [pass, setPass] = useState(""),
    [otp, setOtp] = useState(""),
    [form, setForm] = useState({
      name: "",
      email: "",
      phone: "",
      farm: "",
      license: "",
      clinic: "",
      password: "",
      confirm: "",
    }),
    [confirmation, setConfirmation] = useState(null),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  const recaptcha = useRef(null);
  const initRecaptcha = () => {
    if (!recaptcha.current) {
      recaptcha.current = new RecaptchaVerifier(auth, "recaptcha-container", {
        size: "invisible",
      });
    }
  };
  const finishPhone = async () => {
    setBusy(true);
    setError("");
    try {
      const cred = await confirmation.confirm(otp);
      const existing = await getProfile(cred.user.uid);
      if (mode === "register" && !existing) {
        const u = await ensureProfile(cred.user, role, {
          ...form,
          phone: cred.user.phoneNumber || form.phone,
        });
        onLogin(u);
        if (form.email)
          try {
            await apiFetch("/api/notifications/welcome", {
              method: "POST",
              body: JSON.stringify({ role, data: { role } }),
            });
          } catch {}
      } else if (existing) {
        if (existing.role !== role)
          throw new Error("This account belongs to a different role.");
        onLogin(existing);
      } else throw new Error("This account could not be completed.");
    } catch (e) {
      setError(friendlyError(e));
    } finally {
      setBusy(false);
    }
  };
  const phoneStart = async () => {
    setBusy(true);
    setError("");
    try {
      initRecaptcha();
      const result = await signInWithPhoneNumber(
        auth,
        mode === "login" ? phone : form.phone,
        recaptcha.current,
      );
      setConfirmation(result);
    } catch (e) {
      setError(friendlyError(e));
    } finally {
      setBusy(false);
    }
  };
  const resetPassword = async () => {
    setError("");
    if (!email.trim()) return setError("Enter your email address first.");
    setBusy(true);
    try {
      await sendPasswordResetEmail(auth, email.trim());
      setError("Password reset email sent. Check your inbox.");
    } catch (e) {
      setError(friendlyError(e));
    } finally {
      setBusy(false);
    }
  };
  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      if (method === "phone") {
        await phoneStart();
        return;
      }
      if (mode === "register") {
        if (!form.email || !form.password || form.password !== form.confirm)
          throw new Error("Please enter a valid email and matching passwords.");
        const cred = await createUserWithEmailAndPassword(
          auth,
          form.email,
          form.password,
        );
        try {
          await sendEmailVerification(cred.user);
        } catch {}
        const u = await ensureProfile(cred.user, role, form);
        onLogin(u);
        try {
          await apiFetch("/api/notifications/welcome", {
            method: "POST",
            body: JSON.stringify({ name: form.name, role, data: { role } }),
          });
        } catch {}
      } else {
        const cred = await signInWithEmailAndPassword(auth, email, pass);
        const u = await getProfile(cred.user.uid);
        if (!u)
          throw new Error(
            "Your profile could not be found. Please contact support.",
          );
        if (u.role !== role)
          throw new Error("Select the correct account type for this account.");
        onLogin(u);
      }
    } catch (e) {
      setError(friendlyError(e));
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="auth-shell">
      <div className="auth-left">
        <div className="auth-brand">
          <Brand />
          <Language lang={lang} change={change} t={t} />
        </div>
        <div className="auth-visual">
          <div className="visual-copy">
            <span>DHENUSETU</span>
            <h2>{t("introTitle")}</h2>
            <p>{t("introText")}</p>
          </div>
          <div className="auth-feature-stack">
            <div>
              <b>01</b>
              <span>{t("intro1")}</span>
            </div>
            <div>
              <b>02</b>
              <span>{t("intro2")}</span>
            </div>
            <div>
              <b>03</b>
              <span>{t("intro3")}</span>
            </div>
          </div>
        </div>
      </div>
      <div className="auth-card">
        <div className="role-switch">
          <button
            type="button"
            className={role === "Farmer" ? "active" : ""}
            onClick={() => setRole("Farmer")}
          >
            {t("farmer")}
          </button>
          <button
            type="button"
            className={role === "Vet" ? "active" : ""}
            onClick={() => setRole("Vet")}
          >
            {t("vet")}
          </button>
        </div>
        <div className="tabs">
          <button
            type="button"
            className={mode === "login" ? "active" : ""}
            onClick={() => {
              setMode("login");
              setConfirmation(null);
              setError("");
            }}
          >
            {t("login")}
          </button>
          <button
            type="button"
            className={mode === "register" ? "active" : ""}
            onClick={() => {
              setMode("register");
              setConfirmation(null);
              setError("");
            }}
          >
            {t("register")}
          </button>
        </div>
        <div className="method-switch">
          <button
            type="button"
            className={method === "email" ? "active" : ""}
            onClick={() => {
              setMethod("email");
              setConfirmation(null);
              setError("");
            }}
          >
            {t("email")}
          </button>
          <button
            type="button"
            className={method === "phone" ? "active" : ""}
            onClick={() => {
              setMethod("phone");
              setConfirmation(null);
              setError("");
            }}
          >
            {t("phone")}
          </button>
        </div>
        <div className="auth-head">
          <h1>
            {mode === "login"
              ? role === "Vet"
                ? t("vet")
                : t("farmer")
              : role === "Vet"
                ? t("vetRegister")
                : t("farmerRegister")}
          </h1>
        </div>
        <form onSubmit={submit}>
          {mode === "register" && (
            <>
              <div className="field">
                <label>{t("name")}</label>
                <input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  required
                />
              </div>
              {role === "Farmer" ? (
                <div className="field">
                  <label>{t("farm")}</label>
                  <input
                    value={form.farm}
                    onChange={(e) => setForm({ ...form, farm: e.target.value })}
                    required
                  />
                </div>
              ) : (
                <>
                  <div className="field">
                    <label>{t("license")}</label>
                    <input
                      value={form.license}
                      onChange={(e) =>
                        setForm({ ...form, license: e.target.value })
                      }
                      required
                    />
                  </div>
                  <div className="field">
                    <label>{t("clinic")}</label>
                    <input
                      value={form.clinic}
                      onChange={(e) =>
                        setForm({ ...form, clinic: e.target.value })
                      }
                    />
                  </div>
                </>
              )}
              <div className="field">
                <label>
                  {t("email")}{" "}
                  <small>{method === "phone" ? "(optional)" : ""}</small>
                </label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  required={method === "email"}
                />
              </div>
            </>
          )}
          {mode === "login" && method === "email" ? (
            <div className="field">
              <label>{t("email")}</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
          ) : mode === "register" ? (
            <div className="field">
              <label>{t("phone")}</label>
              <input
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                placeholder="+91..."
                required
              />
            </div>
          ) : (
            <div className="field">
              <label>{t("phone")}</label>
              <input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+91..."
                required
              />
            </div>
          )}
          {method === "email" && (
            <PasswordField
              label={t("password")}
              value={mode === "login" ? pass : form.password}
              onChange={(e) =>
                mode === "login"
                  ? setPass(e.target.value)
                  : setForm({ ...form, password: e.target.value })
              }
              t={t}
            />
          )}{" "}
          {mode === "register" && method === "email" && (
            <PasswordField
              label={t("confirm")}
              value={form.confirm}
              onChange={(e) => setForm({ ...form, confirm: e.target.value })}
              t={t}
            />
          )}
          <div id="recaptcha-container" />
          {mode === "login" && method === "email" && (
            <button
              type="button"
              className="link-btn"
              onClick={resetPassword}
              disabled={busy}
            >
              {t("forgotPassword") || "Forgot password?"}
            </button>
          )}
          {confirmation && (
            <div className="field">
              <label>OTP</label>
              <input
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                required
              />
            </div>
          )}
          {error && <div className="error">{error}</div>}
          {confirmation ? (
            <button
              className="primary full"
              type="button"
              onClick={finishPhone}
              disabled={busy}
            >
              {busy ? "Verifying…" : "Verify OTP"} <span>→</span>
            </button>
          ) : (
            <button className="primary full" type="submit" disabled={busy}>
              {busy
                ? method === "phone"
                  ? "Sending OTP…"
                  : "Working…"
                : mode === "login"
                  ? t("login")
                  : t("create")}{" "}
              <span>→</span>
            </button>
          )}
        </form>
      </div>
    </div>
  );
}
function Page({ title, sub, action, children }) {
  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1>{title}</h1>
          <p>{sub}</p>
        </div>
        {action}
      </div>
      {children}
    </div>
  );
}
function Empty({ msg }) {
  return (
    <div className="empty">
      <div>＋</div>
      <b>{msg}</b>
    </div>
  );
}
function Stat({ label, value, meta }) {
  return (
    <div className="stat">
      <span>{label}</span>
      <strong>{value}</strong>
      <small>{meta}</small>
    </div>
  );
}

function HardwarePairing({ animal, t, onPair, onUnpair }) {
  const [deviceId, setDeviceId] = useState(animal.hardware?.deviceId || "");
  const [error, setError] = useState("");
  const pair = async () => {
    const id = deviceId.trim();
    if (!id) {
      setError("Enter the ESP32 unique hardware ID.");
      return;
    }
    try {
      await apiFetch("/api/hardware/pair", {
        method: "POST",
        body: JSON.stringify({ deviceId: id, animalId: animal.id }),
      });
      onPair({ deviceId: id, pairedAt: new Date().toISOString() });
      setError("");
    } catch (e) {
      setError(friendlyError(e));
    }
  };
  return (
    <section className="card hardware-card">
      <div className="section-title">
        <h3>{t("hardware")}</h3>
        {animal.hardware?.deviceId ? (
          <span className="pill no-risk">{t("paired")}</span>
        ) : (
          <span className="pill">{t("insufficient")}</span>
        )}
      </div>
      <p className="muted">
        Use the unique ID reported by the physical ESP32. QR pairing is not
        used.
      </p>
      <div className="form-inline">
        <div className="field">
          <label>{t("deviceId")}</label>
          <input
            value={deviceId}
            onChange={(e) => setDeviceId(e.target.value)}
            placeholder="ESP32-XXXXXXXX"
            disabled={!!animal.hardware?.deviceId}
          />
        </div>
        {animal.hardware?.deviceId ? (
          <button type="button" className="outline" onClick={onUnpair}>
            {t("unpair")}
          </button>
        ) : (
          <button type="button" className="primary" onClick={pair}>
            {t("pairHardware")}
          </button>
        )}
      </div>
      {animal.hardware?.deviceId && (
        <small className="muted">
          {animal.hardware.deviceId} ·{" "}
          {animal.hardware.pairedAt
            ? new Date(animal.hardware.pairedAt).toLocaleString()
            : ""}
        </small>
      )}
      {error && <div className="error">{error}</div>}
    </section>
  );
}

function EditableNumeric({
  label,
  value,
  onChange,
  min,
  max,
  step = 1,
  disabled = false,
}) {
  return (
    <div className="field">
      <label>
        {label} <small>Manual entry until ESP32 is connected</small>
      </label>
      <input
        type="number"
        value={value ?? ""}
        min={min}
        max={max}
        step={step}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
      />
      {disabled && (
        <small className="muted">
          Use “Update today’s info” to record the daily reading.
        </small>
      )}
    </div>
  );
}
function AddAnimal({ user, t, onClose, initial }) {
  const defaults = {
    name: "",
    tag: "",
    species: "Cow",
    breed: "Sahiwal",
    age: "",
    lactation: "",
    milk: "",
    scc: "",
    temp: "",
    conductivity: "",
    pH: "",
    activity: "Normal",
    rumination: "Normal",
    photoUrl: "",
    hardware: null,
    medicalHistory: { vaccinations: [], diseases: [] },
  };
  const [form, setForm] = useState(
    initial
      ? {
          ...defaults,
          ...initial,
          medicalHistory: initial.medicalHistory || defaults.medicalHistory,
        }
      : { ...defaults },
  );
  const [error, setError] = useState("");
  const [uploading, setUploading] = useState(false);
  const change = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const save = async (e) => {
    e.preventDefault();
    setError("");
    if (!form.name.trim() || !form.tag.trim())
      return setError("Animal name and ID are required.");
    if (!breedOptions(form.species).includes(form.breed))
      return setError(t("invalidBreed"));
    if (form.age !== "" && (Number(form.age) < 0 || Number(form.age) > 25))
      return setError("Age must be between 0 and 25 years.");
    if (
      form.lactation !== "" &&
      (Number(form.lactation) < 0 || Number(form.lactation) > 15)
    )
      return setError("Lactation number must be between 0 and 15.");
    if (form.temp !== "" && (Number(form.temp) < 30 || Number(form.temp) > 42))
      return setError("Body temperature must be between 30°C and 42°C.");
    if (form.milk !== "" && (Number(form.milk) < 0 || Number(form.milk) > 100))
      return setError("Milk yield must be between 0 and 100 L/day.");
    if (form.scc !== "" && (Number(form.scc) < 0 || Number(form.scc) > 5000))
      return setError("SCC must be between 0 and 5000 thousand cells/mL.");
    if (form.pH !== "" && (Number(form.pH) < 0 || Number(form.pH) > 14))
      return setError("Milk pH must be between 0 and 14.");
    try {
      const num = (v) => (v === "" || v == null ? "" : Number(v));
      const a = {
        ...form,
        age: num(form.age),
        lactation: num(form.lactation),
        milk: num(form.milk),
        scc: num(form.scc),
        temp: num(form.temp),
        conductivity: num(form.conductivity),
        pH: num(form.pH),
      };
      const cls = riskFromAnimal(a);
      const saved = await saveAnimal(user, {
        ...a,
        risk: cls.risk,
        level: cls.level,
        history:
          initial?.history ||
          (a.milk !== "" || a.scc !== "" || a.temp !== ""
            ? [
                {
                  d: new Date().toISOString(),
                  risk: cls.risk,
                  milk: a.milk === "" ? null : a.milk,
                  scc: a.scc === "" ? null : a.scc,
                  temp: a.temp === "" ? null : a.temp,
                  conductivity: a.conductivity === "" ? null : a.conductivity,
                  pH: a.pH === "" ? null : a.pH,
                  activity: a.activity,
                  rumination: a.rumination,
                },
              ]
            : []),
      });
      if (cls.level === "High" || cls.level === "Moderate") {
        try {
          const vetId = findConnectedVetId(user, saved);
          await dispatchNotification({
            recipientId: user.id,
            title: `${cls.level} mastitis risk: ${saved.name}`,
            body: `${saved.name} (${saved.tag}) has a ${cls.level.toLowerCase()} mastitis risk of ${cls.risk}%.`,
            kind: "risk",
            data: {
              type: "risk",
              animalId: saved.id,
              risk: cls.risk,
              level: cls.level,
              details: {
                risk: cls.risk,
                level: cls.level,
                temp: a.temp,
                scc: a.scc,
                conductivity: a.conductivity,
                pH: a.pH,
                activity: a.activity,
                rumination: a.rumination,
              },
            },
            emailTemplate: "risk",
            animalName: saved.name,
          });
          if (vetId)
            await dispatchNotification({
              recipientId: vetId,
              title: `${cls.level} mastitis risk: ${saved.name}`,
              body: `${saved.name} (${saved.tag}) has a ${cls.level.toLowerCase()} mastitis risk of ${cls.risk}%.`,
              kind: "risk",
              data: {
                type: "risk",
                animalId: saved.id,
                risk: cls.risk,
                level: cls.level,
                details: {
                  risk: cls.risk,
                  level: cls.level,
                  temp: a.temp,
                  scc: a.scc,
                  conductivity: a.conductivity,
                  pH: a.pH,
                  activity: a.activity,
                  rumination: a.rumination,
                },
              },
              emailTemplate: "risk",
              animalName: saved.name,
            });
        } catch {}
      }
      onClose();
    } catch (e) {
      setError(friendlyError(e));
    }
  };
  const photo = async (x) => {
    setUploading(true);
    try {
      const r = await uploadFileToCloud(x, "dhenusetu/animals");
      change("photoUrl", r.url);
    } catch (e) {
      setError(friendlyError(e));
    } finally {
      setUploading(false);
    }
  };
  return (
    <div className="modal-backdrop">
      <div className="modal wide-modal">
        <div className="modal-head">
          <div>
            <h2>{initial ? t("edit") : t("add")}</h2>
            <p>
              {t("validBreeds")}: {breedOptions(form.species).join(" · ")}
            </p>
          </div>
          <button onClick={onClose}>×</button>
        </div>
        <form onSubmit={save}>
          {!initial && (
            <div className="hardware-note">
              <strong>{t("insufficient")}</strong>
              <span>{t("insufficientNew")}</span>
            </div>
          )}
          <div className="photo-upload">
            <div
              className="upload-preview"
              style={
                form.photoUrl
                  ? { backgroundImage: `url(${form.photoUrl})` }
                  : {}
              }
            >
              {!form.photoUrl && <span className="photo-empty">No photo</span>}
            </div>
            <div className="image-actions">
              <label className="upload-btn">
                ＋ {t("uploadImage")}
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) photo(f);
                  }}
                />
              </label>
              <CameraCapture t={t} onDone={(d) => photo(dataUrlToFile(d))} />
              {uploading && <span className="muted">Uploading…</span>}
            </div>
          </div>
          <div className="form-grid">
            <div className="field">
              <label>{t("animalName")}</label>
              <input
                value={form.name}
                onChange={(e) => change("name", e.target.value)}
                required
              />
            </div>
            <div className="field">
              <label>{t("animalId")}</label>
              <input
                value={form.tag}
                onChange={(e) => change("tag", e.target.value)}
                required
              />
            </div>
            <div className="field">
              <label>{t("animalType")}</label>
              <select
                value={form.species}
                onChange={(e) =>
                  change("species", e.target.value) ||
                  setForm((f) => ({
                    ...f,
                    species: e.target.value,
                    breed: breedOptions(e.target.value)[0],
                  }))
                }
              >
                <option>Cow</option>
                <option>Buffalo</option>
              </select>
            </div>
            <div className="field">
              <label>{t("breed")}</label>
              <select
                value={form.breed}
                onChange={(e) => change("breed", e.target.value)}
              >
                {breedOptions(form.species).map((b) => (
                  <option key={b}>{b}</option>
                ))}
              </select>
            </div>
            <div className="field">
              <label>{t("age")}</label>
              <input
                type="number"
                min="0"
                max="25"
                step="0.1"
                value={form.age}
                onChange={(e) => change("age", e.target.value)}
              />
            </div>
            <div className="field">
              <label>{t("lactation")}</label>
              <input
                type="number"
                min="0"
                max="15"
                value={form.lactation}
                onChange={(e) => change("lactation", e.target.value)}
              />
            </div>
          </div>
          <section className="card nested">
            <h3>{t("modelInputs")}</h3>
            <p className="muted">
              These are ESP32/sensor fields. Until the hardware is connected,
              you can enter values manually; later the paired ESP32 can supply
              the same fields.
            </p>
            <div className="form-grid">
              <EditableNumeric
                disabled={!!initial}
                label={t("milkYield")}
                value={form.milk}
                onChange={(v) => change("milk", v)}
                min={0}
                max={100}
                step={0.1}
              />
              <EditableNumeric
                disabled={!!initial}
                label={t("scc")}
                value={form.scc}
                onChange={(v) => change("scc", v)}
                min={0}
                max={5000}
              />
              <EditableNumeric
                disabled={!!initial}
                label={t("temp")}
                value={form.temp}
                onChange={(v) => change("temp", v)}
                min={30}
                max={42}
                step={0.1}
              />
              <EditableNumeric
                disabled={!!initial}
                label={t("conductivity")}
                value={form.conductivity}
                onChange={(v) => change("conductivity", v)}
                min={0}
                max={20}
                step={0.1}
              />
              <EditableNumeric
                disabled={!!initial}
                label={t("ph")}
                value={form.pH}
                onChange={(v) => change("pH", v)}
                min={0}
                max={14}
                step={0.1}
              />
              <div className="field">
                <label>{t("activity")}</label>
                <select
                  disabled={!!initial}
                  value={form.activity}
                  onChange={(e) => change("activity", e.target.value)}
                >
                  <option>Normal</option>
                  <option>Reduced</option>
                  <option>Low</option>
                </select>
              </div>
              <div className="field">
                <label>{t("rumination")}</label>
                <select
                  disabled={!!initial}
                  value={form.rumination}
                  onChange={(e) => change("rumination", e.target.value)}
                >
                  <option>Normal</option>
                  <option>Reduced</option>
                  <option>Low</option>
                </select>
              </div>
            </div>
          </section>
          <section className="card nested">
            <h3>{t("medicalHistory")}</h3>
            <MedicalHistoryEditor t={t} form={form} setForm={setForm} />
          </section>
          {initial && (
            <HardwarePairing
              animal={form}
              t={t}
              onPair={(h) => change("hardware", h)}
              onUnpair={() => change("hardware", null)}
            />
          )}{" "}
          {error && <div className="error">{error}</div>}
          <div className="modal-actions">
            <button type="button" className="outline" onClick={onClose}>
              {t("cancel")}
            </button>
            <button className="primary">{t("save")}</button>
          </div>
        </form>
      </div>
    </div>
  );
}
function FieldReadOnly({ label, value }) {
  return (
    <div className="field hardware-field">
      <label>
        {label} <span className="field-lock">🔒</span>
      </label>
      <input value={value ?? "Waiting for sensor"} disabled readOnly />
    </div>
  );
}
function MedicalHistoryEditor({ t, form, setForm }) {
  const addVac = () =>
    setForm((f) => ({
      ...f,
      medicalHistory: {
        ...f.medicalHistory,
        vaccinations: [
          ...(f.medicalHistory.vaccinations || []),
          { name: "", date: "", certificateUrl: "" },
        ],
      },
    }));
  const addDis = () =>
    setForm((f) => ({
      ...f,
      medicalHistory: {
        ...f.medicalHistory,
        diseases: [
          ...(f.medicalHistory.diseases || []),
          { name: "", date: "", status: "" },
        ],
      },
    }));
  const updateVac = (i, k, v) =>
    setForm((f) => ({
      ...f,
      medicalHistory: {
        ...f.medicalHistory,
        vaccinations: f.medicalHistory.vaccinations.map((x, n) =>
          n === i ? { ...x, [k]: v } : x,
        ),
      },
    }));
  const updateDis = (i, k, v) =>
    setForm((f) => ({
      ...f,
      medicalHistory: {
        ...f.medicalHistory,
        diseases: f.medicalHistory.diseases.map((x, n) =>
          n === i ? { ...x, [k]: v } : x,
        ),
      },
    }));
  return (
    <div className="medical-editor">
      <div className="section-title">
        <h4>{t("vaccinations")}</h4>
        <button type="button" className="outline small" onClick={addVac}>
          ＋ {t("vaccination")}
        </button>
      </div>
      {(form.medicalHistory.vaccinations || []).map((v, i) => (
        <div className="history-record" key={`v-${i}`}>
          <div className="history-fields">
            <div className="field">
              <label>{t("vaccination")}</label>
              <input
                placeholder={t("vaccination")}
                value={v.name}
                onChange={(e) => updateVac(i, "name", e.target.value)}
              />
            </div>
            <div className="field">
              <label>{t("date")}</label>
              <input
                type="date"
                value={v.date}
                onChange={(e) => updateVac(i, "date", e.target.value)}
              />
            </div>
          </div>
          <div className="image-actions">
            <ImageInput
              t={t}
              label={t("certificate")}
              folder="vaccinations"
              onUploaded={(r) => updateVac(i, "certificateUrl", r.url)}
            />
            {v.certificateUrl && (
              <a href={v.certificateUrl} target="_blank" rel="noreferrer">
                <img
                  className="certificate-thumb"
                  src={v.certificateUrl}
                  alt={t("certificate")}
                />
              </a>
            )}
          </div>
        </div>
      ))}
      <div className="section-title disease-title">
        <h4>{t("diseases")}</h4>
        <button type="button" className="outline small" onClick={addDis}>
          ＋ {t("disease")}
        </button>
      </div>
      {(form.medicalHistory.diseases || []).map((d, i) => (
        <div className="history-record" key={`d-${i}`}>
          <div className="history-fields disease-fields">
            <div className="field">
              <label>{t("disease")}</label>
              <input
                placeholder={t("disease")}
                value={d.name}
                onChange={(e) => updateDis(i, "name", e.target.value)}
              />
            </div>
            <div className="field">
              <label>{t("date")}</label>
              <input
                type="date"
                value={d.date}
                onChange={(e) => updateDis(i, "date", e.target.value)}
              />
            </div>
            <div className="field">
              <label>{t("status")}</label>
              <input
                placeholder={t("status")}
                value={d.status}
                onChange={(e) => updateDis(i, "status", e.target.value)}
              />
            </div>
          </div>
        </div>
      ))}
      {!(form.medicalHistory.vaccinations || []).length &&
        !(form.medicalHistory.diseases || []).length && (
          <p className="muted">{t("noMedicalHistory")}</p>
        )}
    </div>
  );
}
function CreateLabReport({ user, animal, t, onClose }) {
  const [form, setForm] = useState({
    testName: "",
    labName: "",
    sampleDate: localDateISO(),
    result: "",
    reportUrl: "",
  });
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const change = (key, value) => setForm((current) => ({ ...current, [key]: value }));
  const save = async (event) => {
    event.preventDefault();
    setError("");
    if (!form.testName.trim()) return setError("Please enter the test name.");
    if (!form.sampleDate) return setError("Please select the sample date.");
    setSaving(true);
    try {
      const report = await saveLabReport(user, {
        ...form,
        testName: form.testName.trim(),
        labName: form.labName.trim(),
        result: form.result.trim(),
        animalId: animal.id,
        animalName: animal.name || "",
        animalTag: animal.tag || "",
      });
      const vetId = findConnectedVetId(user);
      if (vetId) {
        try {
          await dispatchNotification({
            recipientId: vetId,
            title: `New lab report: ${animal.name || "Animal"}`,
            body: `${animal.name || "An animal"} (${animal.tag || "ID unavailable"}) has a new lab report awaiting review.`,
            kind: "lab",
            emailTemplate: "lab",
            animalName: animal.name || "Animal",
            status: "Submitted",
            data: {
              type: "lab",
              reportId: report.id,
              animalId: animal.id,
              animalTag: animal.tag || "",
              testName: form.testName.trim(),
              labName: form.labName.trim(),
              sampleDate: form.sampleDate,
              result: form.result.trim(),
              farmerName: user.name || "",
              farm: user.farm || "",
              details: {
                animalTag: animal.tag || "",
                testName: form.testName.trim(),
                labName: form.labName.trim(),
                sampleDate: form.sampleDate,
                result: form.result.trim(),
                farmerName: user.name || "",
                farm: user.farm || "",
              },
            },
          });
        } catch {
          // Report creation should remain successful if notification delivery is unavailable.
        }
      }
      onClose();
    } catch (err) {
      setError(friendlyError(err));
    } finally {
      setSaving(false);
    }
  };
  return (
    <form className="lab-report-form" onSubmit={save}>
      <div className="form-grid">
        <div className="field">
          <label>Test name</label>
          <input value={form.testName} onChange={(e) => change("testName", e.target.value)} placeholder="e.g. Milk culture" required />
        </div>
        <div className="field">
          <label>Laboratory</label>
          <input value={form.labName} onChange={(e) => change("labName", e.target.value)} placeholder="Laboratory name" />
        </div>
        <div className="field">
          <label>Sample date</label>
          <input type="date" value={form.sampleDate} onChange={(e) => change("sampleDate", e.target.value)} required />
        </div>
        <div className="field">
          <label>Request details</label>
          <textarea value={form.result} onChange={(e) => change("result", e.target.value)} placeholder="Add any details for the veterinarian" rows="3" />
        </div>
      </div>
      <ImageInput t={t} label="Upload report" folder={`dhenusetu/lab-reports/${animal.id}`} onUploaded={(r) => change("reportUrl", r.url)} />
      {form.reportUrl && <small className="muted">Report attachment added.</small>}
      {error && <div className="error">{error}</div>}
      <div className="page-actions">
        <button type="button" className="outline" onClick={onClose} disabled={saving}>Cancel</button>
        <button type="submit" className="primary" disabled={saving}>{saving ? "Saving..." : "Create lab report"}</button>
      </div>
    </form>
  );
}
function AnimalDetail({ user, animal, t, onBack, onEdit }) {
  useCloudVersion();
  const [today, setToday] = useState(localDateISO());
  const [creatingLab, setCreatingLab] = useState(false);
  const labs = (labReportsFor(user) || [])
    .filter((r) => r && r.animalId === animal.id)
    .sort(
      (a, b) =>
        new Date(b.updatedAt || b.createdAt || 0) -
        new Date(a.updatedAt || a.createdAt || 0),
    );
  const history = safeHistory(animal);
  const todayRow = latestHistoryForDay(animal, today);
  const avgMilk = averageField(history, "milk", 7),
    avgScc = averageField(history, "scc", 7),
    avgTemp = averageField(history, "temp", 7);
  return (
    <Page
      title={`${animal.name} · ${animal.tag}`}
      sub={`${animal.species} · ${animal.breed}`}
      action={
        <div className="page-actions">
          <button className="outline" onClick={onBack}>
            ← {t("back")}
          </button>
          <button className="outline" onClick={() => setToday(today)}>
            Today: {dateLabel(today)}
          </button>
          <button
            className="primary"
            onClick={() => window.__dhenusetuNavigate?.(`daily-${animal.id}`)}
          >
            {t("updateToday") || "Update today’s info"}
          </button>
          <button className="primary" onClick={onEdit}>
            {t("edit")}
          </button>
        </div>
      }
    >
      <div className="detail-head card">
        <div
          className="detail-photo"
          style={
            animal.photoUrl
              ? { backgroundImage: `url(${animal.photoUrl})` }
              : {}
          }
        >
          {!animal.photoUrl && (
            <span className="photo-empty-card">No photo</span>
          )}
        </div>
        <div className="detail-main">
          <span className="pill">{animal.level || t("insufficient")}</span>
          <h2>{animal.name}</h2>
          <p>
            {animal.species} · {animal.breed} · {animal.age || "—"} years
          </p>
          <div className="detail-metrics">
            <Stat
              label={t("milkToday") || "Today’s milk"}
              value={todayRow?.milk ?? animal.milk ?? "—"}
              meta="L/day"
            />
            <Stat
              label={t("milkAverage") || "7-day average"}
              value={avgMilk == null ? "—" : avgMilk.toFixed(1)}
              meta="L/day"
            />
            <Stat
              label={t("scc")}
              value={avgScc == null ? (animal.scc ?? "—") : Math.round(avgScc)}
              meta="7-day average"
            />
            <Stat
              label={t("temp")}
              value={todayRow?.temp ?? animal.temp ?? "—"}
              meta="°C today"
            />
          </div>
        </div>
      </div>
      <section className="card">
        <div className="section-title">
          <div>
            <h3>{t("dailyEntry") || "Daily health & sensor data"}</h3>
            <small className="muted">{today}</small>
          </div>
          <button
            className="primary"
            onClick={() => window.__dhenusetuNavigate?.(`daily-${animal.id}`)}
          >
            {t("updateToday") || "Update today’s info"}
          </button>
        </div>
        {todayRow ? (
          <div className="today-summary-grid">
            <Stat
              label={t("milkYield")}
              value={todayRow.milk ?? "—"}
              meta="L/day"
            />
            <Stat
              label={t("scc")}
              value={todayRow.scc ?? "—"}
              meta="thousand cells/mL"
            />
            <Stat label={t("temp")} value={todayRow.temp ?? "—"} meta="°C" />
            <Stat
              label={t("risk")}
              value={todayRow.risk == null ? "—" : `${todayRow.risk}%`}
              meta={todayRow.level || ""}
            />
          </div>
        ) : (
          <Empty msg="No observation recorded for today. Use Update today’s info." />
        )}
      </section>
      <HardwarePairing
        animal={animal}
        t={t}
        onPair={(h) => saveAnimal(user, { ...animal, hardware: h })}
        onUnpair={() => saveAnimal(user, { ...animal, hardware: null })}
      />
      <section className="card">
        <h3>{t("breedCharacteristics")}</h3>
        {breedProfile(animal) ? (
          <div className="info">
            <div>
              <span>{t("breedType")}</span>
              <b>{breedProfile(animal).type}</b>
            </div>
            <div>
              <span>{t("breedTraits")}</span>
              <b>{breedProfile(animal).traits}</b>
            </div>
          </div>
        ) : (
          <span>—</span>
        )}
      </section>
      <section className="card">
        <h3>{t("medicalHistory")}</h3>
        <div className="history-columns">
          <div>
            <h4>{t("vaccinations")}</h4>
            {(animal.medicalHistory?.vaccinations || []).length ? (
              animal.medicalHistory.vaccinations.map((v, i) => (
                <div className="record" key={i}>
                  <b>{v?.name || "—"}</b>
                  <span>{v?.date || "—"}</span>
                  {v?.certificateUrl && (
                    <a href={v.certificateUrl} target="_blank" rel="noreferrer">
                      <img
                        className="certificate-thumb"
                        src={v.certificateUrl}
                        alt={t("certificate")}
                      />
                    </a>
                  )}
                </div>
              ))
            ) : (
              <small>{t("noMedicalHistory")}</small>
            )}
          </div>
          <div>
            <h4>{t("diseases")}</h4>
            {(animal.medicalHistory?.diseases || []).length ? (
              animal.medicalHistory.diseases.map((d, i) => (
                <div className="record" key={i}>
                  <b>{d?.name || "—"}</b>
                  <span>
                    {d?.date || "—"} · {d?.status || "—"}
                  </span>
                </div>
              ))
            ) : (
              <small>{t("noMedicalHistory")}</small>
            )}
          </div>
        </div>
      </section>
      <section className="card">
        <div className="section-title">
          <h3>{t("labReports")}</h3>
          <div className="page-actions">
            <span className="pill">{animal.risk >= 70 ? t("high") : t("live")}</span>
            <button type="button" className="primary small" onClick={() => setCreatingLab((value) => !value)}>
              {creatingLab ? "Cancel" : "Create lab report"}
            </button>
          </div>
        </div>
        {creatingLab && <CreateLabReport user={user} animal={animal} t={t} onClose={() => setCreatingLab(false)} />}
        {labs.length ? (
          labs.map((r) => (
            <div className="lab-track-card" key={r.id}>
              <div className="section-title">
                <div>
                  <b>{r.testName || "—"}</b>
                  <small>
                    {r.labName || "—"} · {r.sampleDate || "—"}
                  </small>
                </div>
                <span
                  className={`pill ${r.status === "Closed" ? "no-risk" : r.status === "Reviewed" ? "moderate" : ""}`}
                >
                  {r.status || "Submitted"}
                </span>
              </div>
              <p>{r.result || "—"}</p>
              {r.closureComment && (
                <div className="closure-result">
                  <b>{t("doctorReview") || "Doctor review"}</b>
                  <p>{r.closureComment}</p>
                </div>
              )}
              {r.reportUrl && (
                <a href={r.reportUrl} target="_blank" rel="noreferrer">
                  <img
                    className="attachment-preview"
                    src={r.reportUrl}
                    alt={t("lab")}
                  />
                </a>
              )}
            </div>
          ))
        ) : (
          <Empty msg={t("noLab")} />
        )}
      </section>
      <AnimalCharts animal={animal} t={t} />
    </Page>
  );
}
function findConnectedVetId(user) {
  const c = connectionPairsFor(user).find((x) => {
    const other = findUser(x.fromId === user.id ? x.toId : x.fromId);
    return other?.role === "Vet";
  });
  return c ? (c.fromId === user.id ? c.toId : c.fromId) : null;
}
function AnimalCharts({ animal, t }) {
  const h = animal.history || [];
  if (!h.length)
    return (
      <section className="card">
        <Empty msg={t("noRecords")} />
      </section>
    );
  return (
    <div className="chartgrid">
      <ChartBox title={t("riskTrend")} data={h} keyName="risk" name="Risk %" />
      <ChartBox
        title={t("milkTrend")}
        data={h}
        keyName="milk"
        name={t("milkYield")}
      />
      <ChartBox title={t("sccTrend")} data={h} keyName="scc" name="SCC" />
      <ChartBox
        title={t("tempTrend")}
        data={h}
        keyName="temp"
        name={t("temp")}
      />
    </div>
  );
}
function riskColor(value) {
  const risk = Number(value);
  return risk >= 70 ? "#c64b4b" : risk >= 40 ? "#d4873d" : "#2f7d4b";
}
function ChartBox({ title, data, keyName, name, type = "line" }) {
  const clean = (data || []).filter(
    (d) =>
      d &&
      d[keyName] !== undefined &&
      d[keyName] !== null &&
      Number.isFinite(Number(d[keyName])),
  );
  const colors = {
    risk: "#c64b4b",
    milk: "#2f7d4b",
    scc: "#4478c0",
    temp: "#d4873d",
  };
  const stroke = colors[keyName] || "#2f7d4b";
  return (
    <section className="card chart-card">
      <div className="chart-title">
        <h3>{title}</h3>
        <span>{name}</span>
      </div>
      {clean.length ? (
        <ResponsiveContainer width="100%" height={280}>
          {type === "bar" ? (
            <BarChart
              data={clean}
              margin={{ top: 18, right: 18, left: 2, bottom: 35 }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="d"
                tick={{ fontSize: 11 }}
                interval={0}
                angle={clean.length > 7 ? -28 : 0}
                textAnchor={clean.length > 7 ? "end" : "middle"}
              />
              <YAxis
                tick={{ fontSize: 11 }}
                domain={keyName === "risk" ? [0, 100] : ["auto", "auto"]}
              />
              <Tooltip />
              <Bar dataKey={keyName} name={name} radius={[6, 6, 0, 0]}>
                {keyName === "risk" ? (
                  clean.map((entry, i) => (
                    <Cell key={`risk-${i}`} fill={riskColor(entry[keyName])} />
                  ))
                ) : (
                  <>
                    {clean.map((entry, i) => (
                      <Cell key={`cell-${i}`} fill={stroke} />
                    ))}
                  </>
                )}
              </Bar>
            </BarChart>
          ) : (
            <LineChart
              data={clean}
              margin={{ top: 18, right: 18, left: 2, bottom: 24 }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="d"
                tick={{ fontSize: 11 }}
                interval="preserveStartEnd"
              />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Line
                type="monotone"
                dataKey={keyName}
                name={name}
                stroke={stroke}
                strokeWidth={3}
                dot={{ r: 3 }}
                activeDot={{ r: 5 }}
              />
            </LineChart>
          )}
        </ResponsiveContainer>
      ) : (
        <div className="chart-empty">No recorded data for this period.</div>
      )}
    </section>
  );
}
function DailyObservationPage({ user, animal, t, onBack }) {
  const today = localDateISO();
  const existing = latestHistoryForDay(animal, today);
  const [date, setDate] = useState(today),
    [milk, setMilk] = useState(existing?.milk ?? ""),
    [scc, setScc] = useState(existing?.scc ?? ""),
    [temp, setTemp] = useState(existing?.temp ?? ""),
    [conductivity, setConductivity] = useState(existing?.conductivity ?? ""),
    [pH, setPH] = useState(existing?.pH ?? ""),
    [activity, setActivity] = useState(existing?.activity || "Normal"),
    [rumination, setRumination] = useState(existing?.rumination || "Normal"),
    [error, setError] = useState(""),
    [saving, setSaving] = useState(false),
    [saved, setSaved] = useState(false);
  const save = async (e) => {
    e.preventDefault();
    setError("");
    setSaved(false);
    if (!date) return setError("Please select the observation date.");
    if (milk === "" || !Number.isFinite(Number(milk)))
      return setError(`Please enter ${t("milkYield")}.`);
    if (Number(milk) < 0 || Number(milk) > 100)
      return setError("Milk yield must be between 0 and 100 L/day.");
    if (temp !== "" && (Number(temp) < 30 || Number(temp) > 42))
      return setError("Body temperature must be between 30°C and 42°C.");
    if (scc !== "" && (Number(scc) < 0 || Number(scc) > 5000))
      return setError("SCC must be between 0 and 5000 thousand cells/mL.");
    if (
      conductivity !== "" &&
      (Number(conductivity) < 0 || Number(conductivity) > 20)
    )
      return setError("Milk conductivity must be between 0 and 20.");
    if (pH !== "" && (Number(pH) < 0 || Number(pH) > 14))
      return setError("Milk pH must be between 0 and 14.");
    setSaving(true);
    try {
      const obs = {
        d: `${date}T${new Date().toTimeString().slice(0, 8)}`,
        milk: Number(milk),
        scc: scc === "" ? null : Number(scc),
        temp: temp === "" ? null : Number(temp),
        conductivity: conductivity === "" ? null : Number(conductivity),
        pH: pH === "" ? null : Number(pH),
        activity,
        rumination,
      };
      const cls = riskFromAnimal({ ...animal, ...obs });
      await recordAnimalDailyObservation(user, animal, {
        ...obs,
        risk: cls.risk,
        level: cls.level,
      });
      setSaved(true);
    } catch (err) {
      setError(friendlyError(err));
    } finally {
      setSaving(false);
    }
  };
  return (
    <Page
      title={`${t("updateToday") || "Update daily information"} · ${animal.name}`}
      sub={`${animal.tag} · ${animal.species} · ${animal.breed}`}
      action={
        <button className="outline" onClick={onBack}>
          ← {t("back")}
        </button>
      }
    >
      <section className="card daily-observation-card">
        <div className="daily-intro">
          <div>
            <span className="eyebrow">
              {t("manualEntry") || "Manual entry until ESP32 is connected"}
            </span>
            <h2>{t("dailyEntry") || "Daily health & sensor data"}</h2>
            <p>
              Enter today's readings. Later the paired ESP32 can send these same
              fields automatically.
            </p>
          </div>
          <div className="pill">{dateLabel(date)}</div>
        </div>
        <form onSubmit={save}>
          <div className="daily-entry-grid">
            <div className="field">
              <label>{t("date")} *</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
              />
            </div>
            <EditableNumeric
              label={t("milkYield")}
              value={milk}
              onChange={setMilk}
              min={0}
              max={100}
              step={0.1}
            />
            <EditableNumeric
              label={t("scc")}
              value={scc}
              onChange={setScc}
              min={0}
              max={5000}
            />
            <EditableNumeric
              label={t("temp")}
              value={temp}
              onChange={setTemp}
              min={30}
              max={42}
              step={0.1}
            />
            <EditableNumeric
              label={t("conductivity")}
              value={conductivity}
              onChange={setConductivity}
              min={0}
              max={20}
              step={0.1}
            />
            <EditableNumeric
              label={t("ph")}
              value={pH}
              onChange={setPH}
              min={0}
              max={14}
              step={0.1}
            />
            <div className="field">
              <label>{t("activity")}</label>
              <select
                value={activity}
                onChange={(e) => setActivity(e.target.value)}
              >
                <option>Normal</option>
                <option>Reduced</option>
                <option>Low</option>
              </select>
            </div>
            <div className="field">
              <label>{t("rumination")}</label>
              <select
                value={rumination}
                onChange={(e) => setRumination(e.target.value)}
              >
                <option>Normal</option>
                <option>Reduced</option>
                <option>Low</option>
              </select>
            </div>
          </div>
          {error && <div className="error">{error}</div>}
          {saved && (
            <div className="success">Daily observation saved successfully.</div>
          )}
          <div className="daily-actions">
            <button className="outline" type="button" onClick={onBack}>
              {t("cancel")}
            </button>
            <button className="primary" type="submit" disabled={saving}>
              {saving ? "Saving…" : t("save")}
            </button>
          </div>
        </form>
      </section>
      <section className="card">
        <h3>{t("risk")}</h3>
        <p className="muted">{t("insufficientNew")}</p>
      </section>
    </Page>
  );
}
function AnimalsPage({ user, t }) {
  useCloudVersion();
  const [show, setShow] = useState(false),
    [selected, setSelected] = useState(null),
    [editing, setEditing] = useState(null),
    [dailyId, setDailyId] = useState(window.__dhenusetuDailyId || null),
    [q, setQ] = useState("");
  useEffect(() => {
    const h = () => setDailyId(window.__dhenusetuDailyId || null);
    window.addEventListener("dhenusetu-daily", h);
    return () => window.removeEventListener("dhenusetu-daily", h);
  }, []);
  const animals = (animalsFor(user) || []).filter(Boolean);
  const filtered = animals.filter((a) =>
    `${a.name || ""} ${a.tag || ""} ${a.species || ""} ${a.breed || ""}`
      .toLowerCase()
      .includes(q.toLowerCase()),
  );
  const dailyAnimal = animals.find((a) => a.id === dailyId);
  if (dailyAnimal)
    return (
      <DailyObservationPage
        user={user}
        animal={dailyAnimal}
        t={t}
        onBack={() => {
          window.__dhenusetuDailyId = null;
          setDailyId(null);
        }}
      />
    );
  if (selected)
    return (
      <AnimalDetail
        user={user}
        animal={selected}
        t={t}
        onBack={() => setSelected(null)}
        onEdit={() => {
          setEditing(selected);
          setSelected(null);
        }}
      />
    );
  return (
    <Page
      title={t("animals")}
      sub={t("allAnimals")}
      action={
        <button className="primary" onClick={() => setShow(true)}>
          ＋ {t("add")}
        </button>
      }
    >
      <div className="toolbar">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={t("search")}
        />
      </div>
      <div className="animal-grid">
        {filtered.map((a) => (
          <article className="animal-card" key={a.id}>
            <div
              className="animal-photo"
              style={
                a.photoUrl ? { backgroundImage: `url(${a.photoUrl})` } : {}
              }
            >
              {!a.photoUrl && <span>No image</span>}
            </div>
            <div className="animal-card-body">
              <div className="animal-heading">
                <div>
                  <h3>{a.name || "Unnamed animal"}</h3>
                  <small>
                    {a.tag || "—"} · {a.species || "—"} · {a.breed || "—"}
                  </small>
                </div>
                <span
                  className={`pill ${a.level === "High" ? "high" : a.level === "Moderate" ? "moderate" : a.level === "Low" ? "low" : "no-risk"}`}
                >
                  {a.level || t("insufficient")}
                </span>
              </div>
              <div className="mini-metrics">
                <div>
                  <span>{t("milkYield")}</span>
                  <b>
                    {a.milk ?? "—"} <em>L/day</em>
                  </b>
                </div>
                <div>
                  <span>{t("scc")}</span>
                  <b>{a.scc ?? "—"}</b>
                </div>
                <div>
                  <span>{t("temp")}</span>
                  <b>
                    {a.temp ?? "—"} <em>°C</em>
                  </b>
                </div>
                <div>
                  <span>{t("risk")}</span>
                  <b>{a.risk == null ? "—" : `${a.risk}%`}</b>
                </div>
              </div>
              <div className="card-actions">
                <button
                  className="outline small"
                  onClick={() => setSelected(a)}
                >
                  {t("details")}
                </button>
                <button
                  className="outline small"
                  onClick={() => setDailyId(a.id)}
                >
                  {t("updateToday") || "Update today"}
                </button>
                <button className="text-btn" onClick={() => setEditing(a)}>
                  {t("edit")}
                </button>
                <button
                  className="text-btn danger"
                  onClick={async () => {
                    if (confirm(t("remove") + "?")) {
                      try {
                        await removeAnimal(user, a.id);
                      } catch (e) {
                        alert(friendlyError(e));
                      }
                    }
                  }}
                >
                  {t("remove")}
                </button>
              </div>
            </div>
          </article>
        ))}
        {!filtered.length && <Empty msg={t("noRecords")} />}
      </div>
      {(show || editing) && (
        <AddAnimal
          user={user}
          t={t}
          initial={editing}
          onClose={() => {
            setShow(false);
            setEditing(null);
          }}
        />
      )}
    </Page>
  );
}
function EnvironmentPage({ user, t }) {
  useCloudVersion();
  const env = farmEnvironmentFor(user);
  const [section, setSection] = useState("shed");
  const saveField = (k, v) => saveEnvironment(user, { ...env, [k]: v });
  const addImage = async (k, r) =>
    saveEnvironment(user, {
      ...env,
      observations: {
        ...(env.observations || {}),
        [k]: {
          ...(env.observations?.[k] || {}),
          images: [...(env.observations?.[k]?.images || []), r.url],
        },
      },
    });
  const cats = [
    ["shed", t("shed")],
    ["feed", t("feed")],
    ["milking", t("milkingArea")],
    ["water", t("water")],
  ];
  const current = cats.find((x) => x[0] === section);
  return (
    <Page
      title={t("environment")}
      sub={t("sharedEnvironment")}
      action={
        <button
          className="outline"
          onClick={() =>
            exportCsv(
              [
                {
                  zone: env.zone,
                  ambientTemp: env.ambientTemp,
                  humidity: env.humidity,
                  housing: env.housing,
                  hygiene: env.hygiene,
                  milking: env.milking,
                },
              ],
              "dhenusetu_environment.csv",
            )
          }
        >
          {t("export")}
        </button>
      }
    >
      <section className="card">
        <div className="info">
          <div>
            <span>{t("ambientTemp")}</span>
            <b>{env.ambientTemp ?? "—"}°C</b>
          </div>
          <div>
            <span>{t("humidity")}</span>
            <b>{env.humidity ?? "—"}%</b>
          </div>
          <div>
            <span>{t("housing")}</span>
            <b>{env.housing || "—"}</b>
          </div>
          <div>
            <span>{t("hygiene")}</span>
            <b>{env.hygiene || "—"}</b>
          </div>
          <div>
            <span>{t("milking")}</span>
            <b>{env.milking || "—"}</b>
          </div>
        </div>
      </section>
      <section className="card">
        <h3>{t("hygiene")} &amp; farm images</h3>
        <div className="env-tabs">
          {cats.map(([k, l]) => (
            <button
              type="button"
              key={k}
              className={section === k ? "active" : ""}
              onClick={() => setSection(k)}
            >
              {l}
            </button>
          ))}
        </div>
        <div className="env-observation">
          <p className="muted">{t("cameraNote")}</p>
          <ImageInput
            t={t}
            label={t("uploadImage")}
            folder={`dhenusetu/environment/${section}`}
            onUploaded={(r) => addImage(section, r)}
          />
          <div className="image-grid">
            {(env.observations?.[section]?.images || []).map((url, i) => (
              <img src={url} alt={current[1]} key={i} />
            ))}
          </div>
          <div className="form-grid">
            <div className="field">
              <label>{t("status")}</label>
              <select
                value={env.observations?.[section]?.status || ""}
                onChange={(e) =>
                  saveEnvironment(user, {
                    ...env,
                    observations: {
                      ...(env.observations || {}),
                      [section]: {
                        ...(env.observations?.[section] || {}),
                        status: e.target.value,
                      },
                    },
                  })
                }
              >
                <option value="">Select</option>
                <option>Good</option>
                <option>Needs attention</option>
                <option>Critical</option>
              </select>
            </div>
            <div className="field">
              <label>{t("notes")}</label>
              <input
                value={env.observations?.[section]?.note || ""}
                onChange={(e) =>
                  saveEnvironment(user, {
                    ...env,
                    observations: {
                      ...(env.observations || {}),
                      [section]: {
                        ...(env.observations?.[section] || {}),
                        note: e.target.value,
                      },
                    },
                  })
                }
              />
            </div>
          </div>
        </div>
      </section>
    </Page>
  );
}

function FarmerVetPage({ user, t }) {
  useCloudVersion();
  const [code, setCode] = useState(""),
    [notice, setNotice] = useState(""),
    [selectedVetId, setSelectedVetId] = useState(null),
    [text, setText] = useState(""),
    [img, setImg] = useState(null);
  const conns = connectionPairsFor(user)
    .map((c) => findUser(c.fromId === user.id ? c.toId : c.fromId))
    .filter((x) => x?.role === "Vet");
  const pending = pendingFor(user);
  const records = vetRecordsFor(user);
  const selectedVet = conns.find((v) => v.id === selectedVetId) || null;
  const msgs = messagesFor(user)
    .filter((m) =>
      selectedVet
        ? (m.fromId === user.id && m.toId === selectedVet.id) ||
          (m.fromId === selectedVet.id && m.toId === user.id)
        : false,
    )
    .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
  const request = async () => {
    try {
      const p = await findPublicProfileById(code);
      if (!p || p.role !== "Vet") throw new Error("Veterinarian ID not found.");
      const c = await sendConnection(user, p);
      setNotice(t("requestSent"));
      try {
        await dispatchNotification({
          recipientId: p.id,
          title: "Farmer connection request",
          body: `${user.name} wants to connect with you.`,
          kind: "connection",
          data: { type: "connection", connectionId: c.id, fromName: user.name },
          emailTemplate: "connection",
        });
      } catch {}
      setCode("");
    } catch (e) {
      setNotice(friendlyError(e));
    }
  };
  const send = async () => {
    if (!selectedVet || (!text.trim() && !img)) return;
    try {
      const m = await sendMessage(user, selectedVet.id, text, img?.url || "");
      try {
        await dispatchNotification({
          recipientId: selectedVet.id,
          title: `New message from ${user.name}`,
          body: text || "Photo attachment received.",
          kind: "message",
          data: {
            type: "message",
            messageId: m.id,
            fromName: user.name,
            messageText: text || "Photo attachment",
            messageTime: new Date(m.createdAt).toLocaleString(),
          },
          emailTemplate: "message",
        });
      } catch {}
      setText("");
      setImg(null);
    } catch (e) {
      setNotice(friendlyError(e));
    }
  };
  return (
    <Page title={t("connectVet")} sub={t("recommendations")}>
      <div className="grid2">
        <section className="card">
          <h3>{t("connectVet")}</h3>
          <div className="field">
            <label>{t("vetId")}</label>
            <input
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="VT-XXXXXXXX"
            />
          </div>
          <button className="primary" onClick={request}>
            {t("sendRequest")}
          </button>
          {notice && <div className="success">{notice}</div>}
        </section>
        <section className="card">
          <h3>{t("connected")}</h3>
          {conns.length ? (
            <div className="contact-list">
              {conns.map((v) => (
                <button
                  type="button"
                  className={`contact-item ${selectedVetId === v.id ? "selected" : ""}`}
                  key={v.id}
                  onClick={() => setSelectedVetId(v.id)}
                >
                  <span className="contact-avatar">{(v.name || "V")[0]}</span>
                  <span>
                    <b>{v.name}</b>
                    <small>
                      {v.profileId} · {v.clinic || ""}
                    </small>
                  </span>
                </button>
              ))}
            </div>
          ) : (
            <Empty msg={t("noVet")} />
          )}
        </section>
      </div>
      {pending.length > 0 && (
        <section className="card">
          <h3>{t("connectionRequests")}</h3>
          {pending.map((c) => (
            <div className="record connection-card" key={c.id}>
              <div>
                <b>{findUser(c.fromId)?.name || "—"}</b>
                <span>{findUser(c.fromId)?.profileId || c.fromId}</span>
              </div>
              <div className="record-actions">
                <button
                  className="primary small"
                  onClick={() => decideConnection(user, c, "approved")}
                >
                  {t("approve")}
                </button>
                <button
                  className="outline small"
                  onClick={() => decideConnection(user, c, "rejected")}
                >
                  {t("reject")}
                </button>
              </div>
            </div>
          ))}
        </section>
      )}
      {selectedVet && (
        <section className="card chat-panel">
          <div className="chat-panel-head">
            <div>
              <h3>{selectedVet.name}</h3>
              <small>
                {selectedVet.profileId} · {selectedVet.clinic || ""}
              </small>
            </div>
          </div>
          <div className="chat-thread">
            {msgs.length ? (
              msgs.map((m) => (
                <div
                  className={`message ${m.fromId === user.id ? "out" : ""}`}
                  key={m.id}
                >
                  <b>{m.fromId === user.id ? user.name : selectedVet.name}</b>
                  {m.text && <p>{m.text}</p>}
                  {m.imageUrl && (
                    <img
                      className="chat-image"
                      src={m.imageUrl}
                      alt="Attachment"
                    />
                  )}
                  <small>{new Date(m.createdAt).toLocaleString()}</small>
                </div>
              ))
            ) : (
              <Empty msg={t("noMessages")} />
            )}
          </div>
          <div className="message-compose">
            <ImageInput
              t={t}
              label={t("uploadImage")}
              folder="dhenusetu/chat"
              onUploaded={setImg}
            />
            {img && (
              <div className="chat-preview">
                <img className="chat-image" src={img.url} alt="Preview" />
                <button
                  className="text-btn danger"
                  onClick={() => setImg(null)}
                >
                  {t("removeAttachment")}
                </button>
              </div>
            )}
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={t("messagePlaceholder")}
            />
            <button className="primary" onClick={send}>
              {t("send")}
            </button>
          </div>
        </section>
      )}
      <section className="card">
        <h3>{t("recommendations")}</h3>
        {records.length ? (
          records.map((r) => (
            <div className="vet-record" key={r.id}>
              <b>{r.animalName}</b>
              <small>{new Date(r.createdAt).toLocaleString()}</small>
              {r.instruction && (
                <p>
                  <strong>{t("instructions")}:</strong> {r.instruction}
                </p>
              )}
              {r.prescription && (
                <p>
                  <strong>{t("prescription")}:</strong> {r.prescription}
                </p>
              )}
              {r.prescriptionUrl && (
                <img
                  className="attachment-preview"
                  src={r.prescriptionUrl}
                  alt="Prescription"
                />
              )}
              {r.report && (
                <p>
                  <strong>{t("veterinaryReports")}:</strong> {r.report}
                </p>
              )}
              {r.reportUrl && (
                <img
                  className="attachment-preview"
                  src={r.reportUrl}
                  alt="Report"
                />
              )}
            </div>
          ))
        ) : (
          <Empty msg={t("noRecords")} />
        )}
      </section>
    </Page>
  );
}
function FarmerLabPage({ user, t }) {
  useCloudVersion();
  const [q, setQ] = useState("");
  const reports = (labReportsFor(user) || [])
    .filter(
      (r) =>
        r &&
        `${r.animalName || ""} ${r.animalTag || ""} ${r.testName || ""} ${r.labName || ""} ${r.status || ""}`
          .toLowerCase()
          .includes(q.toLowerCase()),
    )
    .sort(
      (a, b) =>
        new Date(b.updatedAt || b.createdAt || 0) -
        new Date(a.updatedAt || a.createdAt || 0),
    );
  const steps = [
    "Submitted",
    "Sample collected",
    "Processing",
    "Results ready",
    "Reviewed",
    "Closed",
  ];
  return (
    <Page title={t("labReports")} sub={t("liveTracking")}>
      <section className="card">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={`${t("search")} — ${t("animalName")} / ${t("animalId")}`}
        />
        {reports.length ? (
          reports.map((r) => {
            const idx = Math.max(0, steps.indexOf(r.status || "Submitted"));
            return (
              <article className="lab-track-card farmer-lab-card" key={r.id}>
                <div className="section-title">
                  <div>
                    <h3>
                      {r.animalName || "Animal"} · {r.animalTag || "—"}
                    </h3>
                    <small>
                      {r.testName || "—"} · {r.labName || "—"} ·{" "}
                      {r.sampleDate || "—"}
                    </small>
                  </div>
                  <span
                    className={`pill ${r.status === "Closed" ? "no-risk" : r.status === "Reviewed" ? "moderate" : ""}`}
                  >
                    {r.status || "Submitted"}
                  </span>
                </div>
                <div className="lab-steps">
                  {steps.map((st, i) => (
                    <div
                      className={`lab-step-view ${i <= idx ? "done" : ""} ${i === idx ? "current" : ""}`}
                      key={st}
                    >
                      <span>{i <= idx ? "✓" : i + 1}</span>
                      <small>{st}</small>
                    </div>
                  ))}
                </div>
                {r.result && (
                  <div className="lab-result-box">
                    <b>{t("result")}</b>
                    <p>{r.result}</p>
                  </div>
                )}
                {r.closureComment && (
                  <div className="closure-result">
                    <b>{t("doctorReview") || "Doctor review"}</b>
                    <p>{r.closureComment}</p>
                    {r.closedAt && (
                      <small>{new Date(r.closedAt).toLocaleString()}</small>
                    )}
                  </div>
                )}
                {r.reportUrl && (
                  <a href={r.reportUrl} target="_blank" rel="noreferrer">
                    <img
                      className="attachment-preview"
                      src={r.reportUrl}
                      alt={t("lab")}
                    />
                  </a>
                )}
                <small>
                  {t("liveTracking")} ·{" "}
                  {new Date(r.updatedAt || r.createdAt).toLocaleString()}
                </small>
              </article>
            );
          })
        ) : (
          <Empty msg={t("noLab")} />
        )}
      </section>
    </Page>
  );
}
function VetLabPage({ user, t }) {
  useCloudVersion();
  const conns = connectionPairsFor(user)
    .map((c) => findUser(c.fromId === user.id ? c.toId : c.fromId))
    .filter((x) => x && x.role === "Farmer");
  const farmerIds = new Set(conns.map((f) => f.id));
  const reports = (currentCache().labReports || [])
    .filter((r) => r && r.id && r.farmerId && farmerIds.has(r.farmerId))
    .sort(
      (a, b) =>
        new Date(b.updatedAt || b.createdAt || 0) -
        new Date(a.updatedAt || a.createdAt || 0),
    );
  const [error, setError] = useState(""),
    [busyId, setBusyId] = useState(null),
    [closure, setClosure] = useState({});
  const statuses = [
    "Submitted",
    "Sample collected",
    "Processing",
    "Results ready",
    "Reviewed",
    "Closed",
  ];
  const update = async (r, status) => {
    if (!r?.id || !r.farmerId) {
      setError(
        "This lab report is missing required information and cannot be updated.",
      );
      return;
    }
    const current = statuses.indexOf(r.status || "Submitted");
    const next = statuses.indexOf(status);
    if (status === "Closed" && !String(closure[r.id] || "").trim()) {
      setError(
        "Add the report closure observation/review before closing this report.",
      );
      return;
    }
    if (next !== current + 1) {
      setError(
        `Please move this report step by step. Current status: ${r.status || "Submitted"}.`,
      );
      return;
    }
    setError("");
    const key = `${r.id}:${status}`;
    setBusyId(key);
    try {
      const patch = { status };
      if (status === "Closed") {
        patch.closureComment = String(closure[r.id] || "").trim();
        patch.closedAt = new Date().toISOString();
        patch.reviewedBy = user.name || user.profileId || user.id;
      }
      await updateLabReport(user, r.id, { ...patch, vetId: user.id });
      try {
        await dispatchNotification({
          recipientId: r.farmerId,
          title: `Lab report updated: ${r.animalName || "Animal"}`,
          body: `${r.animalName || "The animal"} (${r.animalTag || "ID unavailable"}) lab report is now ${status}.${patch.closureComment ? ` Doctor review: ${patch.closureComment}` : ""}`,
          kind: "lab",
          data: {
            type: "lab",
            reportId: r.id,
            status,
            fromName: user.name,
            animalId: r.animalId,
            details: {
              animalTag: r.animalTag,
              testName: r.testName,
              labName: r.labName,
              sampleDate: r.sampleDate,
              result: r.result,
              farmerName: r.farmerName,
              farm: r.farm,
              closureComment: patch.closureComment || r.closureComment || "",
            },
          },
          emailTemplate: "lab",
          animalName: r.animalName || "Animal",
          status,
          details: {
            animalTag: r.animalTag,
            testName: r.testName,
            labName: r.labName,
            sampleDate: r.sampleDate,
            result: r.result,
            farmerName: r.farmerName,
            farm: r.farm,
            closureComment: patch.closureComment || r.closureComment || "",
          },
        });
      } catch {}
    } catch (e) {
      setError(friendlyError(e));
    } finally {
      setBusyId(null);
    }
  };
  return (
    <Page title={t("labReports")} sub={t("liveTracking")}>
      <section className="card">
        {error && <div className="error">{error}</div>}
        <div className="lab-grid">
          {reports.map((r) => {
            const idx = statuses.indexOf(r.status || "Submitted");
            const currentIdx = Math.max(0, idx);
            const closed = r.status === "Closed";
            return (
              <article
                className={`lab-track-card interactive-lab ${closed ? "closed" : ""}`}
                key={r.id}
              >
                <div className="section-title">
                  <div>
                    <h3>
                      {r.animalName || "Animal"} · {r.animalTag || "—"}
                    </h3>
                    <small>
                      {r.farmerName || "—"} · {r.farm || "—"} ·{" "}
                      {r.sampleDate || "—"}
                    </small>
                  </div>
                  <span
                    className={`pill ${closed ? "no-risk" : r.status === "Reviewed" ? "moderate" : ""}`}
                  >
                    {r.status || t("submitted")}
                  </span>
                </div>
                <div className="lab-summary-grid">
                  <div>
                    <span>{t("testName")}</span>
                    <b>{r.testName || "—"}</b>
                  </div>
                  <div>
                    <span>{t("labName")}</span>
                    <b>{r.labName || "—"}</b>
                  </div>
                  <div className="full-span">
                    <span>{t("result")}</span>
                    <b>{r.result || "—"}</b>
                  </div>
                </div>
                {r.reportUrl && (
                  <a href={r.reportUrl} target="_blank" rel="noreferrer">
                    <img
                      className="attachment-preview"
                      src={r.reportUrl}
                      alt={t("lab")}
                    />
                  </a>
                )}
                <div className="lab-steps">
                  {statuses.map((st, i) => {
                    const done = i < currentIdx || i === currentIdx;
                    const enabled = !closed && i === currentIdx + 1;
                    return (
                      <button
                        type="button"
                        key={st}
                        className={`lab-step-btn ${done ? "done" : ""} ${i === currentIdx ? "current" : ""}`}
                        disabled={!enabled}
                        onClick={() => enabled && update(r, st)}
                      >
                        <span>{done ? "✓" : i + 1}</span>
                        {st}
                      </button>
                    );
                  })}
                </div>
                {r.status === "Reviewed" && (
                  <div className="closure-box">
                    <label>
                      {t("closureReview") ||
                        "Doctor review / report closure note"}{" "}
                      *
                    </label>
                    <textarea
                      value={closure[r.id] ?? ""}
                      onChange={(e) =>
                        setClosure((x) => ({ ...x, [r.id]: e.target.value }))
                      }
                      placeholder={
                        t("closurePlaceholder") ||
                        "Add the final report observation, review or guidance before closing the report."
                      }
                    />
                    <button
                      type="button"
                      className="primary"
                      disabled={busyId === `${r.id}:Closed`}
                      onClick={() => update(r, "Closed")}
                    >
                      {busyId === `${r.id}:Closed`
                        ? "Closing report…"
                        : t("closeReport") || "Close report"}
                    </button>
                  </div>
                )}
                {r.closureComment && (
                  <div className="closure-result">
                    <b>{t("doctorReview") || "Doctor review"}</b>
                    <p>{r.closureComment}</p>
                    {r.closedAt && (
                      <small>{new Date(r.closedAt).toLocaleString()}</small>
                    )}
                  </div>
                )}{" "}
              </article>
            );
          })}
          {!reports.length && <Empty msg={t("noLab")} />}
        </div>
      </section>
    </Page>
  );
}
function AlertsPage({ user, t }) {
  useCloudVersion();
  const baseAnimals =
    user.role === "Vet" ? currentCache().animals || [] : animalsFor(user) || [];
  const animals = baseAnimals
    .filter(Boolean)
    .filter((a) => Number.isFinite(Number(a.risk)) && Number(a.risk) >= 40)
    .sort((a, b) => (Number(b.risk) || 0) - (Number(a.risk) || 0));
  const riskNotes = (currentCache().notifications || []).filter(
    (n) => n && n.userId === user.id && n.kind === "risk" && !n.read,
  );
  const markRead = async () => {
    try {
      const batch = writeBatch(db);
      riskNotes.forEach((n) =>
        batch.update(doc(db, "notifications", n.id), { read: true }),
      );
      await batch.commit();
    } catch (e) {
      alert(friendlyError(e));
    }
  };
  return (
    <Page
      title={t("alerts")}
      sub={`${animals.length} ${t("alerts").toLowerCase()}`}
      action={
        riskNotes.length ? (
          <button type="button" className="outline" onClick={markRead}>
            {t("markRead")}
          </button>
        ) : null
      }
    >
      {animals.length ? (
        animals.map((a) => (
          <article
            className={`alert-card ${a.risk >= 70 ? "high-alert" : "moderate-alert"}`}
            key={a.id}
          >
            <div className="alert-icon">!</div>
            <div>
              <div className="section-title">
                <h3>{a.level || (a.risk >= 70 ? t("high") : t("moderate"))}</h3>
                <span className="pill">{a.risk}%</span>
              </div>
              <p>
                <strong>{a.name}</strong> · {a.tag}
              </p>
              <small>{a.risk >= 70 ? t("riskHigh") : t("riskModerate")}</small>
            </div>
            <button
              type="button"
              className="outline small"
              onClick={() => window.__dhenusetuNavigate?.("animals")}
            >
              {t("details")}
            </button>
          </article>
        ))
      ) : (
        <section className="card">
          <Empty msg={t("noAlerts")} />
        </section>
      )}
    </Page>
  );
}
function aggregateByDate(rows, key) {
  const map = new Map();
  for (const r of rows) {
    const d = String(r.d || "").slice(0, 10);
    if (!d) continue;
    const m = map.get(d) || { d, count: 0, risk: 0, milk: 0, scc: 0, temp: 0 };
    m.count++;
    m.risk += Number(r.risk) || 0;
    m.milk += Number(r.milk) || 0;
    m.scc += Number(r.scc) || 0;
    m.temp += Number(r.temp) || 0;
    map.set(d, m);
  }
  return [...map.values()]
    .sort((a, b) => a.d.localeCompare(b.d))
    .map((x) => ({
      ...x,
      risk: Math.round(x.risk / x.count),
      milk: Number(x.milk.toFixed(2)),
      scc: Math.round(x.scc / x.count),
      temp: Number((x.temp / x.count).toFixed(2)),
    }));
}
function ReportsPage({ user, t }) {
  useCloudVersion();
  const [mode, setMode] = useState("day"),
    [selectedDate, setSelectedDate] = useState(localDateISO()),
    [selectedMonth, setSelectedMonth] = useState(localMonthISO());
  const animals = (animalsFor(user) || []).filter(Boolean);
  const raw = animals.flatMap((a) =>
    safeHistory(a).map((h) => ({
      ...h,
      d: String(h.d).slice(0, 10),
      animalId: a.id,
      animal: a.name,
      tag: a.tag,
    })),
  );
  const dayRows = dedupeAnimalDayRows(raw.filter((r) => r.d === selectedDate));
  const monthRows = dedupeAnimalDayRows(
    raw.filter((r) => r.d.startsWith(selectedMonth)),
  );
  const data = mode === "day" ? dayRows : aggregateByDate(monthRows);
  const exportRows = data.map((x) => ({
    date: x.d,
    animal: x.animal || "Herd average",
    tag: x.tag || "",
    risk: x.risk ?? "",
    milk: x.milk ?? "",
    scc: x.scc ?? "",
    temp: x.temp ?? "",
  }));
  return (
    <Page
      title={t("reports")}
      sub={t("reportCharts")}
      action={
        <button
          className="outline"
          onClick={() =>
            exportCsv(
              exportRows,
              `dhenusetu_${mode === "day" ? selectedDate : selectedMonth}_report.csv`,
            )
          }
          disabled={!data.length}
        >
          {t("export")}
        </button>
      }
    >
      <section className="card report-filter">
        <div className="report-switch">
          <button
            type="button"
            className={mode === "day" ? "active" : ""}
            onClick={() => setMode("day")}
          >
            {t("daily")}
          </button>
          <button
            type="button"
            className={mode === "month" ? "active" : ""}
            onClick={() => setMode("month")}
          >
            {t("monthly")}
          </button>
        </div>
        <div className="period-controls">
          <div className="field">
            <label>{mode === "day" ? t("date") : t("month")}</label>
            {mode === "day" ? (
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
              />
            ) : (
              <input
                type="month"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
              />
            )}
          </div>
          <div className="period-actions">
            <button
              type="button"
              className="outline small"
              onClick={() =>
                mode === "day"
                  ? setSelectedDate(shiftPeriod(mode, selectedDate, -1))
                  : setSelectedMonth(shiftPeriod(mode, selectedMonth, -1))
              }
            >
              ← {t("previous")}
            </button>
            <button
              type="button"
              className="outline small"
              onClick={() =>
                mode === "day"
                  ? setSelectedDate(shiftPeriod(mode, selectedDate, 1))
                  : setSelectedMonth(shiftPeriod(mode, selectedMonth, 1))
              }
            >
              {t("next")} →
            </button>
          </div>
        </div>
        <div className="report-note">
          {data.length
            ? mode === "day"
              ? `${data.length} animal records for ${selectedDate}.`
              : `${data.length} daily averages for ${selectedMonth}.`
            : t("noDataForPeriod")}
        </div>
      </section>
      <div className="chartgrid">
        <ChartBox
          title={t("riskTrend")}
          data={data.map((x) => ({
            d: mode === "day" ? x.animal : x.d,
            risk: x.risk,
          }))}
          keyName="risk"
          name="Risk %"
          type="bar"
        />
        <ChartBox
          title={t("milkTrend")}
          data={data.map((x) => ({
            d: mode === "day" ? x.animal : x.d,
            milk: x.milk,
          }))}
          keyName="milk"
          name={t("milkYield")}
          type="bar"
        />
      </div>
      <div className="chartgrid">
        <ChartBox
          title={t("sccTrend")}
          data={data.map((x) => ({
            d: mode === "day" ? x.animal : x.d,
            scc: x.scc,
          }))}
          keyName="scc"
          name="SCC"
        />
        <ChartBox
          title={t("tempTrend")}
          data={data.map((x) => ({
            d: mode === "day" ? x.animal : x.d,
            temp: x.temp,
          }))}
          keyName="temp"
          name={t("temp")}
        />
      </div>
      <section className="card">
        <h3>{t("animalStats")}</h3>
        {data.length ? (
          data.map((r, i) => (
            <div
              className="record report-record"
              key={`${r.animal || "herd"}-${r.d}-${i}`}
            >
              <div>
                <b>{r.animal || "Herd average"}</b>
                <small>
                  {r.tag || ""} · {r.d}
                </small>
              </div>
              <span>Risk {r.risk ?? "—"}%</span>
              <span>Milk {r.milk ?? "—"} L</span>
              <span>SCC {r.scc ?? "—"}</span>
              <span>Temp {r.temp ?? "—"}°C</span>
            </div>
          ))
        ) : (
          <Empty msg={t("noDataForPeriod")} />
        )}
      </section>
    </Page>
  );
}
function HealthPage({ user, t }) {
  useCloudVersion();
  const animals = animalsFor(user);
  return (
    <Page
      title={t("health")}
      sub={t("healthSummary")}
      action={
        <button
          className="outline"
          onClick={() => exportCsv(animals, "dhenusetu_health.csv")}
        >
          {t("export")}
        </button>
      }
    >
      <section className="card">
        <div className="record-grid">
          {animals.map((a) => (
            <div className="record" key={a.id}>
              <b>
                {a.name} · {a.tag}
              </b>
              <span>
                {t("temp")}: {a.temp ?? "—"}°C
              </span>
              <span>
                {t("scc")}: {a.scc ?? "—"}
              </span>
              <span>
                {t("activity")}: {a.activity ?? "—"}
              </span>
              <span>
                {t("rumination")}: {a.rumination ?? "—"}
              </span>
            </div>
          ))}
        </div>
      </section>
    </Page>
  );
}
function shiftPeriod(mode, value, delta) {
  if (mode === "day") {
    const d = new Date(value + "T00:00:00");
    d.setDate(d.getDate() + delta);
    return d.toISOString().slice(0, 10);
  }
  const d = new Date(value + "-01T00:00:00");
  d.setMonth(d.getMonth() + delta);
  return d.toISOString().slice(0, 7);
}
function MilkPage({ user, t }) {
  useCloudVersion();
  const [mode, setMode] = useState("day"),
    [selectedDate, setSelectedDate] = useState(localDateISO()),
    [selectedMonth, setSelectedMonth] = useState(localMonthISO());
  const animals = (animalsFor(user) || []).filter(Boolean);
  const raw = animals.flatMap((a) =>
    safeHistory(a).map((h) => ({
      ...h,
      d: String(h.d).slice(0, 10),
      animalId: a.id,
      animal: a.name,
      tag: a.tag,
    })),
  );
  const rows =
    mode === "day"
      ? dedupeAnimalDayRows(raw.filter((r) => r.d === selectedDate))
      : dedupeAnimalDayRows(raw.filter((r) => r.d.startsWith(selectedMonth)));
  const total = rows.reduce((sum, r) => sum + (Number(r.milk) || 0), 0);
  return (
    <Page title={t("milk")} sub={t("milkYield")}>
      <section className="card report-filter">
        <div className="report-switch">
          <button
            type="button"
            className={mode === "day" ? "active" : ""}
            onClick={() => setMode("day")}
          >
            {t("daily")}
          </button>
          <button
            type="button"
            className={mode === "month" ? "active" : ""}
            onClick={() => setMode("month")}
          >
            {t("monthly")}
          </button>
        </div>
        <div className="period-controls">
          <div className="field">
            <label>{mode === "day" ? t("date") : t("month")}</label>
            {mode === "day" ? (
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
              />
            ) : (
              <input
                type="month"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
              />
            )}
          </div>
          <div className="period-actions">
            <button
              type="button"
              className="outline small"
              onClick={() =>
                mode === "day"
                  ? setSelectedDate(shiftPeriod(mode, selectedDate, -1))
                  : setSelectedMonth(shiftPeriod(mode, selectedMonth, -1))
              }
            >
              ← {t("previous")}
            </button>
            <button
              type="button"
              className="outline small"
              onClick={() =>
                mode === "day"
                  ? setSelectedDate(shiftPeriod(mode, selectedDate, 1))
                  : setSelectedMonth(shiftPeriod(mode, selectedMonth, 1))
              }
            >
              {t("next")} →
            </button>
          </div>
        </div>
        <div className="report-summary">
          <span>
            {rows.length
              ? `${rows.length} ${mode === "day" ? "animal" : "daily"} entries`
              : t("noDataForPeriod")}
          </span>
          <b>{rows.length ? `${total.toFixed(1)} L recorded` : ""}</b>
        </div>
      </section>
      <div className="chartgrid">
        <ChartBox
          title={t("milkTrend")}
          data={rows.map((r) => ({
            d: mode === "day" ? r.animal : r.d,
            milk: Number(r.milk) || 0,
          }))}
          keyName="milk"
          name={t("milkYield")}
          type="bar"
        />
        <ChartBox
          title={t("sccTrend")}
          data={rows.map((r) => ({
            d: mode === "day" ? r.animal : r.d,
            scc: Number(r.scc) || 0,
          }))}
          keyName="scc"
          name="SCC"
        />
      </div>
      <section className="card">
        <h3>{t("animals")}</h3>
        {rows.length ? (
          rows.map((r, i) => (
            <div className="record milk-record" key={`${r.animal}-${r.d}-${i}`}>
              <div>
                <b>{r.animal}</b>
                <small>
                  {r.tag} · {r.d}
                </small>
              </div>
              <strong>{Number(r.milk || 0).toFixed(1)} L</strong>
              <span>SCC {r.scc ?? "—"}</span>
            </div>
          ))
        ) : (
          <Empty msg={t("noDataForPeriod")} />
        )}
      </section>
    </Page>
  );
}
function RiskPage({ user, t }) {
  useCloudVersion();
  const animals = animalsFor(user).sort(
    (a, b) => (b.risk || -1) - (a.risk || -1),
  );
  return (
    <Page title={t("risk")} sub={t("forecast")}>
      <section className="card">
        {animals.map((a) => (
          <div className="rank" key={a.id}>
            <div>
              <b>{a.name}</b>
              <small>
                {a.tag} · {a.species}
              </small>
            </div>
            <div className="bar">
              <span
                className={
                  a.risk >= 70 ? "highbar" : a.risk >= 40 ? "modbar" : "lowbar"
                }
                style={{ width: `${a.risk || 0}%` }}
              />
            </div>
            <strong>{a.risk == null ? "—" : `${a.risk}%`}</strong>
            <span className="pill">{a.level || t("insufficient")}</span>
          </div>
        ))}
      </section>
    </Page>
  );
}
function FarmPage({ user, t }) {
  useCloudVersion();
  const animals = animalsFor(user);
  return (
    <Page title={t("myFarm")} sub={user.farm || "—"}>
      <div className="grid2">
        <section className="card">
          <h3>{t("farm")}</h3>
          <div className="info">
            <div>
              <span>{t("name")}</span>
              <b>{user.name}</b>
            </div>
            <div>
              <span>{t("farm")}</span>
              <b>{user.farm || "—"}</b>
            </div>
            <div>
              <span>{t("total")}</span>
              <b>{animals.length}</b>
            </div>
            <div>
              <span>{t("high")}</span>
              <b>{animals.filter((a) => a.risk >= 70).length}</b>
            </div>
          </div>
        </section>
        <section className="card">
          <h3>{t("sharedEnvironment")}</h3>
          <p>{t("environmentReport")}</p>
        </section>
      </div>
    </Page>
  );
}
function NotificationsPage({ user, t }) {
  useCloudVersion();
  const notes = (currentCache().notifications || [])
    .filter((n) => n && n.userId === user.id)
    .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
  const [enabled, setEnabled] = useState(
    typeof Notification !== "undefined" &&
      Notification.permission === "granted",
  );
  const [notice, setNotice] = useState("");
  const toggle = async () => {
    setNotice("");
    try {
      if (enabled) {
        await disablePushNotifications();
        setEnabled(false);
        setNotice(t("notificationsDisabled"));
      } else {
        const ok = await registerPushNotifications();
        if (!ok)
          throw new Error(
            "Notification permission was not granted or this browser does not support push notifications.",
          );
        setEnabled(true);
        setNotice(t("notificationsEnabled"));
      }
    } catch (e) {
      setNotice(friendlyError(e));
    }
  };
  const markRead = async () => {
    try {
      const batch = writeBatch(db);
      notes
        .filter((n) => !n.read)
        .forEach((n) =>
          batch.update(doc(db, "notifications", n.id), { read: true }),
        );
      await batch.commit();
    } catch (e) {
      setNotice(friendlyError(e));
    }
  };
  return (
    <Page
      title={t("notifications")}
      sub={t("live")}
      action={
        <div className="page-actions">
          <button
            type="button"
            className="outline"
            onClick={markRead}
            disabled={!notes.some((n) => !n.read)}
          >
            {t("markRead")}
          </button>
          <button
            type="button"
            className={enabled ? "outline" : "primary"}
            onClick={toggle}
          >
            {enabled ? t("disableNotifications") : t("enableNotifications")}
          </button>
        </div>
      }
    >
      <section className="card">
        {notice && (
          <div
            className={
              notice === t("notificationsEnabled") ||
              notice === t("notificationsDisabled")
                ? "success"
                : "error"
            }
          >
            {notice}
          </div>
        )}
        {notes.length ? (
          notes.map((n) => (
            <div
              className={`notification-row ${n.read ? "read" : ""}`}
              key={n.id}
            >
              <span
                className={`dot ${n.kind === "risk" ? "red" : n.kind === "lab" ? "blue" : "amber"}`}
              />
              <div>
                <b>{n.title || t("notifications")}</b>
                <small>{n.body || ""}</small>
                <time>
                  {n.createdAt ? new Date(n.createdAt).toLocaleString() : ""}
                </time>
              </div>
            </div>
          ))
        ) : (
          <Empty msg={t("noAlerts")} />
        )}
      </section>
    </Page>
  );
}
function ProfilePage({ user, t, setUser }) {
  const [editing, setEditing] = useState(false),
    [busy, setBusy] = useState(false),
    [notice, setNotice] = useState(""),
    [push, setPush] = useState(
      typeof Notification !== "undefined" &&
        Notification.permission === "granted",
    ),
    [form, setForm] = useState({
      name: user.name || "",
      farm: user.farm || "",
      license: user.license || "",
      clinic: user.clinic || "",
      state: user.state || "",
      district: user.district || "",
      village: user.village || "",
      language: user.language || "English",
    });
  useEffect(() => {
    setForm({
      name: user.name || "",
      farm: user.farm || "",
      license: user.license || "",
      clinic: user.clinic || "",
      state: user.state || "",
      district: user.district || "",
      village: user.village || "",
      language: user.language || "English",
    });
  }, [user]);
  const togglePush = async () => {
    setBusy(true);
    setNotice("");
    try {
      if (push) {
        await disablePushNotifications();
        setPush(false);
        setNotice(t("notificationsDisabled"));
      } else {
        const ok = await registerPushNotifications();
        if (!ok)
          throw new Error(
            "Notification permission was not granted or this browser does not support push notifications.",
          );
        setPush(true);
        setNotice(t("notificationsEnabled"));
      }
    } catch (e) {
      setNotice(friendlyError(e));
    } finally {
      setBusy(false);
    }
  };
  const save = async () => {
    setBusy(true);
    setNotice("");
    try {
      const updated = await updateUserProfile(user, form);
      setUser(updated);
      setEditing(false);
      setNotice("Profile updated successfully.");
    } catch (e) {
      setNotice(friendlyError(e));
    } finally {
      setBusy(false);
    }
  };
  return (
    <Page
      title={t("profile")}
      sub={t("account")}
      action={
        !editing ? (
          <button className="outline" onClick={() => setEditing(true)}>
            {t("edit")}
          </button>
        ) : (
          <div className="page-actions">
            <button className="outline" onClick={() => setEditing(false)}>
              {t("cancel")}
            </button>
            <button className="primary" onClick={save} disabled={busy}>
              {t("save")}
            </button>
          </div>
        )
      }
    >
      <div className="profile-layout">
        <section className="card profile-hero">
          <div className="profile-avatar">{(user.name || "D")[0]}</div>
          <h2>{user.name}</h2>
          <p>{user.role}</p>
          <div className="pill">{user.profileId}</div>
        </section>
        <section className="card">
          <h3>{t("personal")}</h3>
          {editing ? (
            <div className="profile-edit-grid">
              {[
                ["name", "name"],
                ["farm", "farm"],
                ["license", "license"],
                ["clinic", "clinic"],
                ["state", "state"],
                ["district", "district"],
                ["village", "village"],
              ].map(([k, l]) => (
                <div className="field" key={k}>
                  <label>{t(l)}</label>
                  <input
                    value={form[k]}
                    onChange={(e) => setForm({ ...form, [k]: e.target.value })}
                  />
                </div>
              ))}
              <div className="field">
                <label>{t("language")}</label>
                <select
                  value={form.language}
                  onChange={(e) =>
                    setForm({ ...form, language: e.target.value })
                  }
                >
                  {LANGUAGES.map((x) => (
                    <option key={x}>{x}</option>
                  ))}
                </select>
              </div>
            </div>
          ) : (
            <div className="info">
              <div>
                <span>{t("name")}</span>
                <b>{user.name}</b>
              </div>
              <div>
                <span>{t("email")}</span>
                <b>{user.email || "—"}</b>
                <span
                  className="locked-icon"
                  title="Locked"
                  aria-label="Locked"
                >
                  🔒
                </span>
              </div>
              <div>
                <span>{t("phone")}</span>
                <b>{user.phone || "—"}</b>
                <span
                  className="locked-icon"
                  title="Locked"
                  aria-label="Locked"
                >
                  🔒
                </span>
              </div>
              <div>
                <span>{t("farm")}</span>
                <b>{user.farm || "—"}</b>
              </div>
              <div>
                <span>{t("village")}</span>
                <b>{user.village || "—"}</b>
              </div>
              <div>
                <span>{t("district")}</span>
                <b>{user.district || "—"}</b>
              </div>
              <div>
                <span>{t("state")}</span>
                <b>{user.state || "—"}</b>
              </div>
            </div>
          )}
        </section>
        <section className="card">
          <div className="section-title">
            <div>
              <h3>{t("notifications")}</h3>
              <p className="muted">{t("pushNotifications")}</p>
            </div>
            <button
              type="button"
              className={push ? "toggle on" : "toggle"}
              onClick={togglePush}
              disabled={busy}
              aria-pressed={push}
            >
              <span />
            </button>
          </div>
          <div className="toggle-label">
            <b>
              {push ? t("notificationsEnabled") : t("notificationsDisabled")}
            </b>
            <span>{t("pushNotifications")}</span>
          </div>
          {notice && <div className="success">{notice}</div>}
        </section>
      </div>
    </Page>
  );
}
function localDateISO(date = new Date()) {
  const d = new Date(date);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
function dateLabel(value) {
  const raw = String(value || "");
  const d = /^\d{4}-\d{2}-\d{2}$/.test(raw)
    ? new Date(`${raw}T00:00:00`)
    : new Date(value);
  return Number.isNaN(d.getTime())
    ? raw
    : d.toLocaleDateString(undefined, {
        day: "numeric",
        month: "short",
        year: "numeric",
      });
}
function localMonthISO(date = new Date()) {
  return localDateISO(date).slice(0, 7);
}
function safeHistory(a) {
  return (Array.isArray(a?.history) ? a.history : []).filter((h) => h && h.d);
}
function historyForDate(a, date) {
  return safeHistory(a)
    .filter((h) => String(h.d).slice(0, 10) === date)
    .sort((x, y) => String(y.d).localeCompare(String(x.d)));
}
function latestHistoryForDay(a, date) {
  return historyForDate(a, date)[0] || null;
}
function averageField(history, key, days = 7) {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days + 1);
  const vals = (history || [])
    .filter((h) => h && h.d && Number.isFinite(Number(h[key])))
    .filter((h) => new Date(h.d) >= cutoff)
    .map((h) => Number(h[key]));
  return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null;
}
function dedupeAnimalDayRows(rows) {
  const map = new Map();
  for (const r of rows || []) {
    if (!r?.animalId || !r?.d) continue;
    const k = `${r.animalId}|${String(r.d).slice(0, 10)}`;
    const prev = map.get(k);
    if (!prev || String(r.d) > String(prev.d)) map.set(k, r);
  }
  return [...map.values()].sort((a, b) =>
    String(a.d).localeCompare(String(b.d)),
  );
}
function AppShell({
  active,
  setActive,
  user,
  logout,
  t,
  lang,
  change,
  alertCount = 0,
  notificationCount = 0,
  nav,
  children,
}) {
  useEffect(() => {
    window.__dhenusetuNavigate = (target) => {
      if (String(target).startsWith("daily-")) {
        window.__dhenusetuDailyId = String(target).slice(6);
        setActive("animals");
        window.dispatchEvent(new Event("dhenusetu-daily"));
        return;
      }
      setActive(target);
    };
    return () => {
      delete window.__dhenusetuNavigate;
      delete window.__dhenusetuDailyId;
    };
  }, [setActive]);
  const labels = {
    home: t("overview"),
    farm: t("myFarm"),
    animals: t("animals"),
    milk: t("milk"),
    health: t("health"),
    environment: t("environment"),
    risk: t("risk"),
    vet: t("vetSection"),
    lab: t("labReports"),
    alerts: t("alerts"),
    reports: t("reports"),
    profile: t("profile"),
    farmers: t("farmers"),
    requests: t("connectionRequests"),
    messages: t("messages"),
    notifications: t("notifications"),
  };
  const icons = {
    home: "⌂",
    farm: "⌂",
    animals: "◉",
    milk: "◒",
    health: "♡",
    environment: "☁",
    risk: "⌁",
    vet: "⚕",
    lab: "⌁",
    alerts: "!",
    reports: "▥",
    profile: "○",
    farmers: "♙",
    requests: "✓",
    messages: "✉",
    notifications: "•",
  };
  return (
    <div className="app">
      <aside>
        <div className="side-brand">
          <Brand />
        </div>
        <div className="side-nav">
          {nav.map((id) => (
            <button
              key={id}
              className={active === id ? "active" : ""}
              onClick={() => setActive(id)}
            >
              <i>{icons[id]}</i>
              <span>{labels[id]}</span>
              {id === "alerts" && alertCount > 0 && (
                <b className="nav-badge">{alertCount}</b>
              )}
              {id === "notifications" && notificationCount > 0 && (
                <b className="nav-badge">{notificationCount}</b>
              )}
            </button>
          ))}
        </div>
        <div className="side-bottom">
          <button className="logout" onClick={logout}>
            <span className="logout-icon" aria-hidden="true">
              ↪
            </span>
            <span className="logout-label">{t("logout")}</span>
          </button>
        </div>
      </aside>
      <main>
        <header>
          <div>
            <span className="mobile-brand">DhenuSetu</span>
            <span className="header-sub">{t("tagline")}</span>
          </div>
          <div className="header-actions">
            <Language lang={lang} change={change} t={t} />
            <button
              className="top-alert-btn"
              type="button"
              onClick={() => setActive("alerts")}
              aria-label={t("alerts")}
            >
              !{alertCount > 0 && <span>{alertCount}</span>}
            </button>
            <button
              className="notification-btn"
              type="button"
              onClick={() => setActive("notifications")}
              aria-label={t("notifications")}
            >
              ♢{notificationCount > 0 && <span>{notificationCount}</span>}
            </button>
            <div className="user-mini">
              <div>{(user.name || "D")[0]}</div>
              <span>{user.name}</span>
            </div>
          </div>
        </header>
        <div className="content">{children}</div>
        <VoiceAssistant
          t={t}
          setActive={setActive}
          user={user}
          animals={animalsFor(user)}
          active={active}
        />
      </main>
    </div>
  );
}
function OverviewPage({ user, animals, t, setActive }) {
  const high = animals.filter((a) => Number(a.risk) >= 70).length,
    mod = animals.filter(
      (a) => Number(a.risk) >= 40 && Number(a.risk) < 70,
    ).length;
  return (
    <Page title={t("welcome")} sub={t("subtitle")}>
      <div className="hero-card">
        <div>
          <span className="eyebrow">{t("forecast")}</span>
          <h2>{t("mastitis")}</h2>
          <p>{t("introText")}</p>
          <button className="primary" onClick={() => setActive("risk")}>
            {t("risk")} →
          </button>
        </div>
        <div
          className="hero-image"
          style={{ backgroundImage: `url(${COW_IMG})` }}
        />
      </div>
      <div className="stats">
        <button className="stat-button" onClick={() => setActive("animals")}>
          <Stat
            label={t("total")}
            value={animals.length}
            meta={t("monitored")}
          />
        </button>
        <button className="stat-button" onClick={() => setActive("animals")}>
          <Stat
            label={t("cows")}
            value={animals.filter((a) => a.species === "Cow").length}
            meta="Cow"
          />
        </button>
        <button className="stat-button" onClick={() => setActive("animals")}>
          <Stat
            label={t("buffaloes")}
            value={animals.filter((a) => a.species === "Buffalo").length}
            meta="Buffalo"
          />
        </button>
        <button className="stat-button" onClick={() => setActive("risk")}>
          <Stat label={t("high")} value={high} meta={t("riskHigh")} />
        </button>
        <button className="stat-button" onClick={() => setActive("risk")}>
          <Stat label={t("moderate")} value={mod} meta={t("riskModerate")} />
        </button>
      </div>
      <div className="grid2">
        <section className="card">
          <div className="section-title">
            <h3>{t("riskTrend")}</h3>
            <button className="text-btn" onClick={() => setActive("risk")}>
              {t("details")}
            </button>
          </div>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart
              data={animals.map((a) => ({
                name: a.name,
                risk: Number(a.risk) || 0,
              }))}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis domain={[0, 100]} />
              <Tooltip />
              <Bar dataKey="risk" radius={[6, 6, 0, 0]}>
                {animals.map((a, i) => (
                  <Cell
                    key={`overview-risk-${a.id || i}`}
                    fill={riskColor(a.risk)}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </section>
        <section className="card">
          <div className="section-title">
            <h3>{t("recent")}</h3>
            <button className="text-btn" onClick={() => setActive("alerts")}>
              {t("alerts")}
            </button>
          </div>
          {animals
            .filter((a) => Number(a.risk) >= 40)
            .sort((a, b) => (Number(b.risk) || 0) - (Number(a.risk) || 0))
            .slice(0, 4)
            .map((a) => (
              <div className="alert-row" key={a.id}>
                <span
                  className={`dot ${Number(a.risk) >= 70 ? "red" : "amber"}`}
                />
                <div>
                  <b>
                    {a.name} · {a.tag}
                  </b>
                  <small>{a.risk}%</small>
                </div>
                <strong>{a.level || t("insufficient")}</strong>
              </div>
            ))}
          {!animals.some((a) => Number(a.risk) >= 40) && (
            <Empty msg={t("noAlerts")} />
          )}
        </section>
      </div>
    </Page>
  );
}
function FarmerLayout({ user, logout, t, setLang, lang, setUser }) {
  useCloudVersion();
  const [active, setActive] = useState("home");
  const animals = (animalsFor(user) || []).filter(Boolean);
  const alertCount = animals.filter(
    (a) => Number.isFinite(Number(a.risk)) && Number(a.risk) >= 40,
  ).length;
  const notificationCount = (currentCache().notifications || []).filter(
    (n) => n && n.userId === user.id && !n.read,
  ).length;
  let page;
  if (active === "home")
    page = (
      <OverviewPage user={user} animals={animals} t={t} setActive={setActive} />
    );
  else if (active === "farm") page = <FarmPage user={user} t={t} />;
  else if (active === "animals") page = <AnimalsPage user={user} t={t} />;
  else if (active === "milk") page = <MilkPage user={user} t={t} />;
  else if (active === "health") page = <HealthPage user={user} t={t} />;
  else if (active === "environment")
    page = <EnvironmentPage user={user} t={t} />;
  else if (active === "risk") page = <RiskPage user={user} t={t} />;
  else if (active === "vet") page = <FarmerVetPage user={user} t={t} />;
  else if (active === "lab") page = <FarmerLabPage user={user} t={t} />;
  else if (active === "alerts") page = <AlertsPage user={user} t={t} />;
  else if (active === "reports") page = <ReportsPage user={user} t={t} />;
  else if (active === "profile")
    page = <ProfilePage user={user} t={t} setUser={setUser} />;
  else page = <NotificationsPage user={user} t={t} />;
  return (
    <AppShell
      active={active}
      setActive={setActive}
      user={user}
      logout={logout}
      t={t}
      lang={lang}
      change={setLang}
      alertCount={alertCount}
      notificationCount={notificationCount}
      nav={[
        "home",
        "farm",
        "animals",
        "milk",
        "health",
        "environment",
        "risk",
        "vet",
        "lab",
        "alerts",
        "reports",
        "profile",
        "notifications",
      ]}
    >
      {page}
    </AppShell>
  );
}
function VetLayout({ user, logout, setUser }) {
  useCloudVersion();
  const { t, lang, change } = useI18n();
  const [active, setActive] = useState("home");
  const farmers = connectionPairsFor(user)
    .map((c) => findUser(c.fromId === user.id ? c.toId : c.fromId))
    .filter((x) => x?.role === "Farmer");
  const animals = (currentCache().animals || []).filter(Boolean);
  const pending = pendingFor(user);
  const alertCount = animals.filter(
    (a) => Number.isFinite(Number(a.risk)) && Number(a.risk) >= 40,
  ).length;
  const notificationCount = (currentCache().notifications || []).filter(
    (n) => n && n.userId === user.id && !n.read,
  ).length;
  let page;
  if (active === "home")
    page = (
      <VetHome
        user={user}
        farmers={farmers}
        animals={animals}
        t={t}
        setActive={setActive}
      />
    );
  else if (active === "farmers")
    page = (
      <VetFarmersPage user={user} farmers={farmers} animals={animals} t={t} />
    );
  else if (active === "lab") page = <VetLabPage user={user} t={t} />;
  else if (active === "requests")
    page = <VetRequests user={user} pending={pending} t={t} />;
  else if (active === "messages")
    page = <VetMessages user={user} farmers={farmers} t={t} />;
  else if (active === "alerts") page = <AlertsPage user={user} t={t} />;
  else if (active === "reports")
    page = <VetReports user={user} farmers={farmers} animals={animals} t={t} />;
  else if (active === "notifications")
    page = <NotificationsPage user={user} t={t} />;
  else page = <ProfilePage user={user} t={t} setUser={setUser} />;
  return (
    <AppShell
      active={active}
      setActive={setActive}
      user={user}
      logout={logout}
      t={t}
      lang={lang}
      change={change}
      alertCount={alertCount}
      notificationCount={notificationCount}
      nav={[
        "home",
        "farmers",
        "requests",
        "lab",
        "messages",
        "alerts",
        "reports",
        "profile",
        "notifications",
      ]}
    >
      {page}
    </AppShell>
  );
}
function VetFarmersPage({ farmers, animals, t }) {
  const [selected, setSelected] = useState(null),
    [query, setQuery] = useState("");
  const safeFarmers = (farmers || []).filter(
    (f) => f?.id && f.role === "Farmer",
  );
  const visible = safeFarmers.filter((f) =>
    `${f.name || ""} ${f.profileId || ""} ${f.farm || ""}`
      .toLowerCase()
      .includes(query.toLowerCase()),
  );
  const animalCount = (animals || []).filter(
    (a) => a?.ownerId && safeFarmers.some((f) => f.id === a.ownerId),
  ).length;
  if (selected)
    return (
      <VetAnimalDetail
        animal={selected}
        t={t}
        onBack={() => setSelected(null)}
      />
    );
  return (
    <Page title={t("farmers")} sub={t("connectionSecurity")}>
      <div className="vet-farmers-page">
        <section className="vet-directory-hero">
          <div>
            <span className="eyebrow">{t("connected")}</span>
            <h2>{t("farmers")}</h2>
            <p>{t("connectionSecurity")}</p>
          </div>
          <div className="vet-directory-stats">
            <div>
              <strong>{safeFarmers.length}</strong>
              <span>{t("farmers")}</span>
            </div>
            <div>
              <strong>{animalCount}</strong>
              <span>{t("animals")}</span>
            </div>
          </div>
        </section>
        <section className="card farmer-directory-panel">
          <div className="farmer-directory-toolbar">
            <div>
              <h3>{t("farmers")}</h3>
              <small>
                {visible.length} {t("farmers").toLowerCase()}
              </small>
            </div>
            <label className="farmer-search">
              <span>⌕</span>
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={t("search")}
              />
            </label>
          </div>
          {visible.length ? (
            <div className="farmer-directory-grid">
              {visible.map((f) => {
                const farmerAnimals = (animals || []).filter(
                  (a) => a?.ownerId === f.id,
                );
                return (
                  <article className="farmer-directory-card" key={f.id}>
                    <div className="farmer-card-top">
                      <div className="farmer-avatar">
                        {(f.name || "F").slice(0, 1).toUpperCase()}
                      </div>
                      <div className="farmer-identity">
                        <h3>{f.name || "—"}</h3>
                        <span>{f.profileId || "—"}</span>
                        <small>{f.farm || t("farm")}</small>
                      </div>
                      <span className="connected-mark">✓</span>
                    </div>
                    <div className="farmer-card-meta">
                      <div>
                        <span>{t("animals")}</span>
                        <strong>{farmerAnimals.length}</strong>
                      </div>
                      <div>
                        <span>{t("location")}</span>
                        <strong>
                          {f.village || f.district || f.state || "—"}
                        </strong>
                      </div>
                    </div>
                    <div className="farmer-card-footer">
                      {farmerAnimals.length ? (
                        <div className="animal-chip-list">
                          {farmerAnimals.map((a) => (
                            <button
                              type="button"
                              className="animal-chip"
                              key={a.id}
                              onClick={() => setSelected(a)}
                            >
                              <span>{a.name || a.tag || t("details")}</span>
                              <b>→</b>
                            </button>
                          ))}
                        </div>
                      ) : (
                        <span className="muted">{t("noRecords")}</span>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          ) : (
            <Empty msg={t("noFarmers")} />
          )}
        </section>
      </div>
    </Page>
  );
}
function VetHome({ user, farmers, animals, t, setActive }) {
  return (
    <Page title={t("vetSection")} sub={`${t("profileId")}: ${user.profileId}`}>
      <section className="card">
        <div className="section-title">
          <h3>{t("connectFarmer")}</h3>
          <button className="outline" onClick={() => setActive("requests")}>
            {t("connectionRequests")}
          </button>
        </div>
        <VetConnectBox user={user} t={t} />
      </section>
      <div className="stats">
        <button className="stat-button" onClick={() => setActive("farmers")}>
          <Stat label={t("farmers")} value={farmers.length} meta={t("farms")} />
        </button>
        <button className="stat-button" onClick={() => setActive("farmers")}>
          <Stat
            label={t("allAnimals")}
            value={animals.length}
            meta={t("animals")}
          />
        </button>
        <button className="stat-button" onClick={() => setActive("lab")}>
          <Stat
            label={t("labReports")}
            value={currentCache().labReports.length}
            meta={t("liveTracking")}
          />
        </button>
      </div>
    </Page>
  );
}
function VetConnectBox({ user, t }) {
  const [code, setCode] = useState(""),
    [msg, setMsg] = useState("");
  const go = async () => {
    try {
      const p = await findPublicProfileById(code);
      if (!p || p.role !== "Farmer") throw new Error("Farmer ID not found.");
      const c = await sendConnection(user, p);
      setMsg(t("requestSent"));
      setCode("");
      try {
        await dispatchNotification({
          recipientId: p.id,
          title: "Veterinarian connection request",
          body: `Dr. ${user.name} sent a connection request.`,
          kind: "connection",
          data: { type: "connection", connectionId: c.id, fromName: user.name },
          emailTemplate: "connection",
        });
      } catch {}
    } catch (e) {
      setMsg(friendlyError(e));
    }
  };
  return (
    <div className="form-inline">
      <div className="field">
        <label>{t("farmerId")}</label>
        <input
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="FR-XXXXXXXX"
        />
      </div>
      <button className="primary" onClick={go}>
        {t("sendRequest")}
      </button>
      {msg && <span className="success inline">{msg}</span>}
    </div>
  );
}
function VetRequests({ user, pending, t }) {
  return (
    <Page title={t("connectionRequests")} sub={t("connectionSecurity")}>
      <section className="card">
        {pending.length ? (
          pending.map((c) => {
            const other = findUser(c.fromId);
            return (
              <div className="record connection-card" key={c.id}>
                <div>
                  <b>{other?.name || "—"}</b>
                  <span>
                    {other?.profileId || c.fromId} · {other?.farm || ""}
                  </span>
                </div>
                <div className="record-actions">
                  <button
                    className="primary small"
                    onClick={async () => {
                      await decideConnection(user, c, "approved");
                      try {
                        await dispatchNotification({
                          recipientId: c.fromId,
                          title: "Connection approved",
                          body: `Dr. ${user.name} approved your connection.`,
                          kind: "connection",
                          data: { type: "connection", fromName: user.name },
                          emailTemplate: "connection",
                        });
                      } catch {}
                    }}
                  >
                    {t("approve")}
                  </button>
                  <button
                    className="outline small"
                    onClick={() => decideConnection(user, c, "rejected")}
                  >
                    {t("reject")}
                  </button>
                </div>
              </div>
            );
          })
        ) : (
          <Empty msg={t("noRecords")} />
        )}
      </section>
    </Page>
  );
}
function VetAnimalDetail({ animal, t, onBack }) {
  useCloudVersion();
  const labs = (currentCache().labReports || [])
    .filter((r) => r && r.animalId === animal.id)
    .sort(
      (a, b) =>
        new Date(b.updatedAt || b.createdAt || 0) -
        new Date(a.updatedAt || a.createdAt || 0),
    );
  const history = safeHistory(animal);
  return (
    <Page
      title={`${animal.name || "Animal"} · ${animal.tag || "—"}`}
      sub={`${animal.species || "—"} · ${animal.breed || "—"}`}
      action={
        <button className="outline" onClick={onBack}>
          ← {t("back")}
        </button>
      }
    >
      <div className="detail-head card">
        <div
          className="detail-photo"
          style={
            animal.photoUrl
              ? { backgroundImage: `url(${animal.photoUrl})` }
              : {}
          }
        >
          {!animal.photoUrl && (
            <span className="photo-empty-card">No photo</span>
          )}
        </div>
        <div className="detail-main">
          <span className="pill">{animal.level || t("insufficient")}</span>
          <h2>{animal.name || "Animal"}</h2>
          <p>
            {animal.species || "—"} · {animal.breed || "—"} ·{" "}
            {animal.age ?? "—"} years
          </p>
          <div className="detail-metrics">
            <Stat
              label={t("milkToday") || "Today’s milk"}
              value={
                latestHistoryForDay(animal, localDateISO())?.milk ??
                animal.milk ??
                "—"
              }
              meta="L/day"
            />
            <Stat
              label={t("milkAverage") || "7-day average"}
              value={
                averageField(history, "milk", 7) == null
                  ? "—"
                  : averageField(history, "milk", 7).toFixed(1)
              }
              meta="L/day"
            />
            <Stat label={t("scc")} value={animal.scc ?? "—"} meta="SCC" />
            <Stat label={t("temp")} value={animal.temp ?? "—"} meta="°C" />
          </div>
        </div>
      </div>
      <section className="card">
        <h3>{t("medicalHistory")}</h3>
        <div className="history-columns">
          <div>
            <h4>{t("vaccinations")}</h4>
            {(animal.medicalHistory?.vaccinations || []).length ? (
              animal.medicalHistory.vaccinations.map((v, i) => (
                <div className="history-display" key={i}>
                  <div>
                    <b>{v?.name || "—"}</b>
                    <span>{v?.date || "—"}</span>
                  </div>
                  {v?.certificateUrl && (
                    <a href={v.certificateUrl} target="_blank" rel="noreferrer">
                      <img
                        className="certificate-thumb"
                        src={v.certificateUrl}
                        alt={t("certificate")}
                      />
                    </a>
                  )}
                </div>
              ))
            ) : (
              <small>{t("noMedicalHistory")}</small>
            )}
          </div>
          <div>
            <h4>{t("diseases")}</h4>
            {(animal.medicalHistory?.diseases || []).length ? (
              animal.medicalHistory.diseases.map((d, i) => (
                <div className="history-display" key={i}>
                  <div>
                    <b>{d?.name || "—"}</b>
                    <span>
                      {d?.date || "—"} · {d?.status || "—"}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <small>{t("noMedicalHistory")}</small>
            )}
          </div>
        </div>
      </section>
      <section className="card">
        <div className="section-title">
          <div>
            <h3>{t("labReports")}</h3>
            <small className="muted">{t("liveTracking")}</small>
          </div>
        </div>
        {labs.length ? (
          labs.map((r) => (
            <div className="lab-track-card" key={r.id}>
              <div className="section-title">
                <div>
                  <b>{r.testName || t("lab")}</b>
                  <small>
                    {r.labName || "—"} · {r.sampleDate || "—"}
                  </small>
                </div>
                <span
                  className={`pill ${r.status === "Closed" ? "no-risk" : r.status === "Reviewed" ? "moderate" : ""}`}
                >
                  {r.status || t("submitted")}
                </span>
              </div>
              {r.result && (
                <p>
                  <strong>{t("result")}:</strong> {r.result}
                </p>
              )}
              {r.closureComment && (
                <div className="closure-result">
                  <b>{t("doctorReview") || "Doctor review"}</b>
                  <p>{r.closureComment}</p>
                </div>
              )}
              {r.reportUrl && (
                <a href={r.reportUrl} target="_blank" rel="noreferrer">
                  <img
                    className="attachment-preview"
                    src={r.reportUrl}
                    alt={t("lab")}
                  />
                </a>
              )}
            </div>
          ))
        ) : (
          <Empty msg={t("noLab")} />
        )}
      </section>
      {history.length > 0 && (
        <div className="chartgrid">
          <ChartBox
            title={t("riskTrend")}
            data={history}
            keyName="risk"
            name="Risk %"
            type="bar"
          />
          <ChartBox
            title={t("milkTrend")}
            data={history}
            keyName="milk"
            name={t("milkYield")}
          />
          <ChartBox
            title={t("sccTrend")}
            data={history}
            keyName="scc"
            name="SCC"
          />
          <ChartBox
            title={t("tempTrend")}
            data={history}
            keyName="temp"
            name={t("temp")}
          />
        </div>
      )}
    </Page>
  );
}
function VetReports({ farmers, animals, t }) {
  const [mode, setMode] = useState("day"),
    [date, setDate] = useState(localDateISO()),
    [month, setMonth] = useState(localMonthISO()),
    [farmerId, setFarmerId] = useState("all");
  const safeFarmers = (farmers || []).filter(Boolean);
  const safeAnimals = (animals || []).filter(
    (a) => a && (!farmerId || farmerId === "all" || a.ownerId === farmerId),
  );
  const raw = safeAnimals.flatMap((a) =>
    safeHistory(a).map((h) => ({
      ...h,
      d: String(h.d).slice(0, 10),
      animalId: a.id,
      animal: a.name,
      tag: a.tag,
      farmerId: a.ownerId,
    })),
  );
  const dayRows = dedupeAnimalDayRows(raw.filter((r) => r.d === date));
  const monthRows = dedupeAnimalDayRows(
    raw.filter((r) => r.d.startsWith(month)),
  );
  const data = mode === "day" ? dayRows : aggregateByDate(monthRows);
  return (
    <Page
      title={t("reports")}
      sub={t("reportCharts")}
      action={
        <button
          className="outline"
          onClick={() =>
            exportCsv(
              data,
              `dhenusetu_vet_${mode === "day" ? date : month}.csv`,
            )
          }
          disabled={!data.length}
        >
          {t("export")}
        </button>
      }
    >
      <section className="card report-filter">
        <div className="field">
          <label>{t("farmers")}</label>
          <select
            value={farmerId}
            onChange={(e) => setFarmerId(e.target.value)}
          >
            <option value="all">All connected farmers</option>
            {safeFarmers.map((f) => (
              <option key={f.id} value={f.id}>
                {f.name} · {f.profileId} · {f.farm || ""}
              </option>
            ))}
          </select>
        </div>
        <div className="report-switch">
          <button
            type="button"
            className={mode === "day" ? "active" : ""}
            onClick={() => setMode("day")}
          >
            {t("daily")}
          </button>
          <button
            type="button"
            className={mode === "month" ? "active" : ""}
            onClick={() => setMode("month")}
          >
            {t("monthly")}
          </button>
        </div>
        <div className="period-controls">
          <div className="field">
            <label>{mode === "day" ? t("date") : t("month")}</label>
            {mode === "day" ? (
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            ) : (
              <input
                type="month"
                value={month}
                onChange={(e) => setMonth(e.target.value)}
              />
            )}
          </div>
          <div className="period-actions">
            <button
              type="button"
              className="outline small"
              onClick={() =>
                mode === "day"
                  ? setDate(shiftPeriod(mode, date, -1))
                  : setMonth(shiftPeriod(mode, month, -1))
              }
            >
              ← {t("previous")}
            </button>
            <button
              type="button"
              className="outline small"
              onClick={() =>
                mode === "day"
                  ? setDate(shiftPeriod(mode, date, 1))
                  : setMonth(shiftPeriod(mode, month, 1))
              }
            >
              {t("next")} →
            </button>
          </div>
        </div>
        <div className="report-note">
          {data.length
            ? mode === "day"
              ? `${data.length} animal records for ${date}.`
              : `${data.length} daily averages for ${month}.`
            : t("noDataForPeriod")}
        </div>
      </section>
      <div className="chartgrid">
        <ChartBox
          title={t("riskTrend")}
          data={data.map((x) => ({
            d: mode === "day" ? x.animal : x.d,
            risk: x.risk,
          }))}
          keyName="risk"
          name="Risk %"
          type="bar"
        />
        <ChartBox
          title={t("milkTrend")}
          data={data.map((x) => ({
            d: mode === "day" ? x.animal : x.d,
            milk: x.milk,
          }))}
          keyName="milk"
          name={t("milkYield")}
          type="bar"
        />
      </div>
      <div className="chartgrid">
        <ChartBox
          title={t("sccTrend")}
          data={data.map((x) => ({
            d: mode === "day" ? x.animal : x.d,
            scc: x.scc,
          }))}
          keyName="scc"
          name="SCC"
        />
        <ChartBox
          title={t("tempTrend")}
          data={data.map((x) => ({
            d: mode === "day" ? x.animal : x.d,
            temp: x.temp,
          }))}
          keyName="temp"
          name={t("temp")}
        />
      </div>
      <section className="card">
        <h3>{t("animalStats")}</h3>
        {data.length ? (
          data.map((r, i) => (
            <div
              className="record report-record"
              key={`${r.animal || "herd"}-${r.d}-${i}`}
            >
              <div>
                <b>{r.animal || "Herd average"}</b>
                <small>
                  {r.tag || ""} · {r.d}
                </small>
              </div>
              <span>Risk {r.risk ?? "—"}%</span>
              <span>Milk {r.milk ?? "—"} L</span>
              <span>SCC {r.scc ?? "—"}</span>
              <span>Temp {r.temp ?? "—"}°C</span>
            </div>
          ))
        ) : (
          <Empty msg={t("noDataForPeriod")} />
        )}
      </section>
    </Page>
  );
}
function VetMessages({ user, farmers, t }) {
  const [selectedFarmerId, setSelectedFarmerId] = useState(null);
  const [text, setText] = useState(""),
    [img, setImg] = useState(null),
    [notice, setNotice] = useState("");
  const msgs = messagesFor(user);
  const selectedFarmer = farmers.find((f) => f.id === selectedFarmerId) || null;
  const thread = msgs
    .filter(
      (m) =>
        selectedFarmer &&
        ((m.fromId === user.id && m.toId === selectedFarmer.id) ||
          (m.fromId === selectedFarmer.id && m.toId === user.id)),
    )
    .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
  const send = async () => {
    if (!selectedFarmer || (!text.trim() && !img)) return;
    try {
      const m = await sendMessage(
        user,
        selectedFarmer.id,
        text,
        img?.url || "",
      );
      try {
        await dispatchNotification({
          recipientId: selectedFarmer.id,
          title: `New message from ${user.name}`,
          body: text || "Photo attachment received.",
          kind: "message",
          data: {
            type: "message",
            messageId: m.id,
            fromName: user.name,
            messageText: text || "Photo attachment",
            messageTime: new Date(m.createdAt).toLocaleString(),
          },
          emailTemplate: "message",
        });
      } catch {}
      setText("");
      setImg(null);
      setNotice("");
    } catch (e) {
      setNotice(friendlyError(e));
    }
  };
  return (
    <Page title={t("messages")} sub={t("live")}>
      <section className="card">
        <h3>{t("farmers")}</h3>
        {farmers.length ? (
          <div className="contact-list">
            {farmers.map((f) => (
              <button
                type="button"
                className={`contact-item ${selectedFarmerId === f.id ? "selected" : ""}`}
                key={f.id}
                onClick={() => {
                  setSelectedFarmerId(f.id);
                  setText("");
                  setImg(null);
                }}
              >
                <span className="contact-avatar">{(f.name || "F")[0]}</span>
                <span>
                  <b>{f.name}</b>
                  <small>
                    {f.profileId} · {f.farm || ""}
                  </small>
                </span>
              </button>
            ))}
          </div>
        ) : (
          <Empty msg={t("noFarmers")} />
        )}
      </section>
      {selectedFarmer && (
        <section className="card chat-panel">
          <div className="chat-panel-head">
            <div>
              <h3>{selectedFarmer.name}</h3>
              <small>
                {selectedFarmer.profileId} · {selectedFarmer.farm || ""}
              </small>
            </div>
          </div>
          {notice && <div className="error">{notice}</div>}
          <div className="chat-thread">
            {thread.length ? (
              thread.map((m) => (
                <div
                  className={`message ${m.fromId === user.id ? "out" : ""}`}
                  key={m.id}
                >
                  <b>
                    {m.fromId === user.id ? user.name : selectedFarmer.name}
                  </b>
                  {m.text && <p>{m.text}</p>}
                  {m.imageUrl && (
                    <img
                      className="chat-image"
                      src={m.imageUrl}
                      alt="Attachment"
                    />
                  )}
                  <small>{new Date(m.createdAt).toLocaleString()}</small>
                </div>
              ))
            ) : (
              <Empty msg={t("noMessages")} />
            )}
          </div>
          <div className="message-compose">
            <ImageInput
              t={t}
              label={t("uploadImage")}
              folder="dhenusetu/chat"
              onUploaded={setImg}
            />
            {img && (
              <div className="chat-preview">
                <img className="chat-image" src={img.url} alt="Preview" />
                <button
                  className="text-btn danger"
                  onClick={() => setImg(null)}
                >
                  {t("removeAttachment")}
                </button>
              </div>
            )}
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={t("messagePlaceholder")}
            />
            <button className="primary" onClick={send}>
              {t("send")}
            </button>
          </div>
        </section>
      )}
    </Page>
  );
}
function cleanSpeechText(value) {
  return String(value || "")
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/^\s{0,3}#{1,6}\s*/gm, "")
    .replace(/\*{1,3}/g, "")
    .replace(/_{1,3}/g, "")
    .replace(/`/g, "")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/^\s*[-*+]\s+/gm, "")
    .replace(/^\s*\d+\.\s+/gm, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}
function VoiceAssistant({ t, setActive, user, animals }) {
  const [open, setOpen] = useState(false),
    [listening, setListening] = useState(false),
    [input, setInput] = useState(""),
    [history, setHistory] = useState([]),
    recognitionRef = useRef(null);
  const { code } = useI18n();
  const speak = (text) => {
    try {
      if (!("speechSynthesis" in window)) return;
      const clean = cleanSpeechText(text);
      if (!clean) return;
      speechSynthesis.cancel();
      const voices = speechSynthesis.getVoices();
      const preferred = voices.find((v) =>
        v.lang?.toLowerCase().startsWith(code.toLowerCase().split("-")[0]),
      );
      const u = new SpeechSynthesisUtterance(clean);
      u.lang = preferred?.lang || code;
      u.voice = preferred || null;
      speechSynthesis.speak(u);
    } catch {}
  };
  const navigate = (text) => {
    const x = text
      .toLowerCase()
      .replace(/[!?.,]/g, " ")
      .replace(/\s+/g, " ")
      .trim();
    const roleEntries =
      user.role === "Vet"
        ? [
            [
              "farmers",
              [
                "farmers",
                "connected farmers",
                "farmer list",
                "किसान",
                "शेतकरी",
              ],
            ],
            [
              "requests",
              ["connection requests", "requests", "अनुरोध", "विनंत्या"],
            ],
            ["messages", ["messages", "chat", "संदेश"]],
            [
              "lab",
              ["lab reports", "lab report", "laboratory", "रिपोर्ट", "लॅब"],
            ],
            ["reports", ["reports", "analytics", "अहवाल"]],
            ["profile", ["profile", "account", "प्रोफाइल"]],
            [
              "notifications",
              ["notifications", "notification", "सूचना", "अलर्ट"],
            ],
            ["home", ["dashboard", "home", "overview", "आढावा", "डैशबोर्ड"]],
          ]
        : [
            ["farm", ["my farm", "farm", "माझे शेत", "मेरा फार्म", "फार्म"]],
            [
              "animals",
              [
                "animals",
                "animal",
                "cow",
                "buffalo",
                "पशु",
                "पशुधन",
                "गाय",
                "म्हैस",
              ],
            ],
            [
              "milk",
              ["milk", "milk quality", "milk quantity", "दूध", "दूध गुणवत्ता"],
            ],
            ["health", ["health", "medical", "आरोग्य", "स्वास्थ्य"]],
            [
              "environment",
              [
                "environment",
                "hygiene",
                "farm environment",
                "पर्यावरण",
                "स्वच्छता",
              ],
            ],
            [
              "risk",
              [
                "risk",
                "mastitis",
                "mastitis risk",
                "मास्टायटिस",
                "जोखिम",
                "धोका",
              ],
            ],
            [
              "vet",
              [
                "connected veterinarian",
                "veterinarian",
                "vet",
                "doctor",
                "पशुवैद्यक",
                "डॉक्टर",
              ],
            ],
            [
              "lab",
              ["lab reports", "lab report", "laboratory", "रिपोर्ट", "लॅब"],
            ],
            ["alerts", ["alerts", "alert", "notification", "सूचना", "अलर्ट"]],
            ["reports", ["reports", "analytics", "अहवाल"]],
            ["profile", ["profile", "account", "प्रोफाइल"]],
            [
              "home",
              [
                "dashboard",
                "home",
                "overview",
                "आढावा",
                "डैशबोर्ड",
                "मुख्यपृष्ठ",
              ],
            ],
          ];
    for (const [id, words] of roleEntries.sort(
      (a, b) =>
        Math.max(...b[1].map((w) => w.length)) -
        Math.max(...a[1].map((w) => w.length)),
    )) {
      if (words.some((w) => x === w || x.includes(w))) {
        setActive(id);
        const label = t(id === "home" ? "overview" : id);
        const msg = `${label} opened.`;
        setHistory((h) =>
          [
            ...h,
            { role: "user", text },
            { role: "assistant", text: msg },
          ].slice(-12),
        );
        speak(msg);
        return true;
      }
    }
    return false;
  };
  const run = async (text) => {
    const clean = text.trim();
    if (!clean) return;
    setInput("");
    if (navigate(clean)) return;
    setHistory((h) =>
      [
        ...h,
        { role: "user", text: clean },
        { role: "assistant", text: "Thinking…" },
      ].slice(-12),
    );
    try {
      const r = await aiChat(
        clean,
        {
          role: user.role,
          animals: animals
            .slice(0, 20)
            .map((a) => ({
              name: a.name,
              tag: a.tag,
              risk: a.risk,
              level: a.level,
              breed: a.breed,
            })),
        },
        history.slice(-10),
      );
      const answer = r.text || "No response was returned.";
      setHistory((h) => {
        const copy = [...h];
        copy[copy.length - 1] = { role: "assistant", text: answer };
        return copy;
      });
      speak(answer);
    } catch (e) {
      const message = friendlyError(e);
      setHistory((h) => {
        const copy = [...h];
        copy[copy.length - 1] = { role: "assistant", text: message };
        return copy;
      });
      speak(message);
    }
  };
  const start = () => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) {
      setHistory((h) => [
        ...h,
        {
          role: "assistant",
          text: "Voice input is not available in this browser. You can type your question.",
        },
      ]);
      return;
    }
    if (recognitionRef.current || listening) return;
    const r = new SR();
    recognitionRef.current = r;
    r.lang = code;
    r.interimResults = false;
    r.maxAlternatives = 1;
    r.onstart = () => setListening(true);
    r.onend = () => {
      recognitionRef.current = null;
      setListening(false);
    };
    r.onresult = (e) => run(e.results[0][0].transcript);
    r.onerror = (e) => {
      recognitionRef.current = null;
      setListening(false);
      const msg =
        e.error === "not-allowed"
          ? "Microphone permission was denied. Allow microphone access for this site."
          : e.error === "service-not-allowed"
            ? "Speech recognition is blocked by this browser. Use Chrome or Edge and allow microphone access."
            : e.error === "network"
              ? "The browser speech service is unavailable. Check your internet connection or use the typed chat."
              : e.error === "aborted"
                ? "Voice input was cancelled. Please try again."
                : e.error === "no-speech"
                  ? "No speech was detected. Please try again."
                  : e.error === "audio-capture"
                    ? "No working microphone was found."
                    : "Voice input could not be started. Please try again.";
      setHistory((h) => [...h, { role: "assistant", text: msg }]);
    };
    try {
      r.start();
    } catch {
      recognitionRef.current = null;
      setListening(false);
      setHistory((h) => [
        ...h,
        {
          role: "assistant",
          text: "Voice input could not be started. Please try again.",
        },
      ]);
    }
  };
  return (
    <div className={`voice-assistant ${open ? "open" : ""}`}>
      <button
        className="floating-voice"
        onClick={() => setOpen((v) => !v)}
        aria-label={t("assistant")}
      >
        🎙️
      </button>
      {open && (
        <div className="voice-panel">
          <div className="voice-head">
            <div>
              <b>{t("assistant")}</b>
              <small>{t("assistantHint")}</small>
            </div>
            <button className="icon-btn" onClick={() => setOpen(false)}>
              ×
            </button>
          </div>
          <div className="voice-answer">
            {history.length ? (
              history.map((m, i) => (
                <div
                  className={
                    m.role === "user"
                      ? "assistant-msg user-msg"
                      : "assistant-msg"
                  }
                  key={i}
                >
                  <span>{m.role === "user" ? "You" : "DhenuSetu"}</span>
                  <p>{m.text}</p>
                </div>
              ))
            ) : (
              <div className="assistant-empty">{t("assistantHint")}</div>
            )}
          </div>
          <div className="voice-row">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && run(input)}
              placeholder="Type…"
            />
            <button
              className={`voice-mic ${listening ? "listening" : ""}`}
              onClick={start}
              aria-label="Voice input"
            >
              {listening ? "●" : "🎤"}
            </button>
            <button
              className="primary small"
              onClick={() => run(input)}
              disabled={!input.trim()}
            >
              Ask
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
function App() {
  const { t, lang, change } = useI18n();
  const [loading, setLoading] = useState(true),
    [user, setUser] = useState(null),
    [intro, setIntro] = useState(true);
  useEffect(() => {
    if (!firebaseConfigured) {
      setLoading(false);
      return;
    }
    const unsub = onAuthStateChanged(auth, async (u) => {
      try {
        if (u) {
          const p = await getProfile(u.uid);
          if (p) {
            setUser(p);
            setIntro(false);
          } else setUser(null);
        } else setUser(null);
      } catch {
      } finally {
        setLoading(false);
      }
    });
    return () => unsub();
  }, []);
  useEffect(() => {
    if (!user || !firebaseConfigured) return;
    let active = true;
    let stop = () => {};
    (async () => {
      try {
        const cleanup = await listenForegroundNotifications((payload) => {
          const n = payload.notification || {};
          if (
            "Notification" in window &&
            Notification.permission === "granted"
          ) {
            try {
              new Notification(n.title || "DhenuSetu", {
                body: n.body || "",
                icon: "/dhenusetu-logo-icon.png",
              });
            } catch {}
          }
        });
        if (active) stop = cleanup || (() => {});
        else cleanup?.();
      } catch {}
    })();
    return () => {
      active = false;
      try {
        stop();
      } catch {}
    };
  }, [user]);
  const logout = async () => {
    await signOut(auth);
    currentCache().user = null;
    setUser(null);
  };
  useEffect(() => {
    if (user) return startLiveSync(user);
  }, [user]);
  if (!firebaseConfigured) return <SetupScreen />;
  if (loading) return <div className="boot-screen">Loading DhenuSetu…</div>;
  if (!user) {
    if (intro) return <Intro onContinue={() => setIntro(false)} />;
    return (
      <Auth
        onLogin={(u) => {
          setUser(u);
          setIntro(false);
        }}
      />
    );
  }
  return user.role === "Vet" ? (
    <VetLayout user={user} logout={logout} setUser={setUser} />
  ) : (
    <FarmerLayout
      user={user}
      logout={logout}
      setUser={setUser}
      lang={lang}
      setLang={change}
      t={t}
    />
  );
}
class AppErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }
  static getDerivedStateFromError(error) {
    return { error };
  }
  componentDidCatch(error, info) {
    console.error("DhenuSetu render error", error, info);
  }
  render() {
    if (this.state.error) {
      return (
        <div className="boot-screen">
          <div className="setup-card">
            <img src="/dhenusetu-logo-emblem.png" alt="DhenuSetu" />
            <h1>DhenuSetu</h1>
            <p>The application could not display this page.</p>
            <p className="muted">
              Please refresh the page. If the problem continues, open the
              browser console and check the first red error.
            </p>
            <button
              className="primary"
              onClick={() => window.location.reload()}
            >
              Reload application
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

function SetupScreen() {
  return (
    <div className="boot-screen">
      <div className="setup-card">
        <img src="/dhenusetu-logo-emblem.png" alt="DhenuSetu" />
        <h1>DhenuSetu</h1>
        <p>Firebase Web configuration is required.</p>
        <p>
          Open <code>frontend/src/config/firebase.config.js</code> and paste the
          Firebase Web App configuration from Firebase Console.
        </p>
      </div>
    </div>
  );
}

if ("serviceWorker" in navigator) {
  navigator.serviceWorker.addEventListener("message", (event) => {
    if (event.data?.type === "NAVIGATE" && window.__dhenusetuNavigate) {
      window.__dhenusetuNavigate(event.data.target || "alerts");
    }
  });
}
createRoot(document.getElementById("root")).render(
  <AppErrorBoundary>
    <App />
  </AppErrorBoundary>,
);
