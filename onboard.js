import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.117.3/+esm";

// Public project URL and publishable key (they identify the project; access is enforced by the rules and functions in
// supabase/schema.sql). PKCE: Google sign-in comes back with a one-time code, never with tokens in the address.
const supabase = createClient("https://wdqmqzeynvahrzgrddhl.supabase.co", "sb_publishable_kq_e29b0EZ3u6Y17liz58g_zcgza21W",
  { auth: { flowType: "pkce" } });
let user = null;   // the signed-in Supabase user (id, email, user_metadata from Google)

// Must match include/Taxonomy.h (same order, TAXONOMY_VERSION 1)
const INTERESTS = ["AI", "Fintech", "Healthtech", "Climate", "Web3", "SaaS", "E-commerce", "Edtech",
  "Robotics", "Hardware", "Cybersecurity", "Data", "Design", "Marketing", "Sales", "Product",
  "Gaming", "Media", "Biotech", "Mobility", "Proptech", "Agritech", "Impact", "Space",
  "Chips", "Cloud", "DevTools", "Consumer", "Food", "Travel", "Sports", "Music"];
const OFFER = ["Hiring", "Investing", "Mentoring", "Co-founder material",
  "Selling", "Open to partner", "Freelancing", "Giving advice"];
const SEEK = ["Job hunting", "Raising", "Seeking mentor", "Seeking co-founder",
  "Buying", "Seeking partners", "Hiring freelancers", "Seeking advice"];
// Dating events: the same bits with these labels (Taxonomy.h DATING_INTEREST_LABELS / DATING_GOAL_LABELS, "" = unused)
const DATING_INTERESTS = ["Running", "Hiking", "Gym", "Yoga", "Climbing", "Cycling", "Dancing", "Cooking",
  "Brunch", "Coffee", "Wine", "Travel", "Beach", "Live music", "Karaoke", "Movies",
  "Gaming", "Board games", "Books", "Art", "Photography", "Pets", "Meditation", "Volunteering",
  "Early bird", "Night owl", "Dog person", "Cat person", "Coffee date", "Drinks date", "Planner", "Spontaneous"];
// From this bit on: the quick picks, this-or-that pairs (24 or 25, 26 or 27, ...): before hobbies in the Matches tab
const DATING_PICK_FIRST = 24;
// A dating sign's hint and iceBaeker line under the name (Taxonomy.h, the same wording; datingSign): a shared quick
// pick, a pair split, a shared hobby ("Both into <hobby>"), else a general pair. Every dating sign plays iceBaeker, a
// game of Bae or Nay: flat pairs, 2i badge A's line and 2i + 1 badge B's (the same text twice: one prompt both answer)
const DATING_PICK_HINTS = ["Both early birds", "Both night owls", "Both dog people", "Both cat people",
  "Both into coffee dates", "Both into drinks dates", "Both planners", "Both spontaneous"];
const DATING_PICK_GAMES = ["Plan us a 7am date", "Pick the breakfast spot", "Pick our 2am supper spot", "Guess what they'd order",
  "Give clues to a dog you love", "Guess the breed", "Tell a true or fake cat story", "True or made up?",
  "Pick a cafe for our date", "Pick what we order", "Order a drink for them", "Say if they got you right",
  "Plan our first date", "Pick the dinner spot", "Pick a place for tonight", "Pick what we do there"];
const DATING_SPLIT_HINTS = ["Early bird meets night owl", "Dog person meets cat person", "Coffee meets drinks",
  "Planner meets spontaneous"];
// Line A goes to whoever picked the pair's first side (early bird, dog person, coffee date, planner)
const DATING_SPLIT_GAMES = ["Defend mornings", "Defend nights", "Defend dogs", "Defend cats",
  "Defend coffee dates", "Defend drinks dates", "Defend planning", "Defend winging it"];
const DATING_HOBBY_GAMES = ["Give clues to your best run", "Guess how far it was", "Give clues to a trail you love", "Guess the trail",
  "Guess their gym routine", "Say if they're right", "Give clues to your fave pose", "Guess the pose",
  "Give clues to a top climb", "Guess the grade", "Plan us a bike ride", "Pick the food stop after",
  "Give clues to a dance style", "Guess the dance", "Give clues to your best dish", "Guess the dish",
  "Order brunch for them", "Say how close they got", "Guess their coffee order", "Say how close they got",
  "Pick a wine for them", "Guess why they chose it", "Give clues to your best trip", "Guess where they went",
  "Give clues to a fave beach", "Guess where it is", "Give clues to a fave concert", "Guess who played",
  "Say a lyric but not the title", "Name that song", "Give clues to a fave film", "Guess the film",
  "Give clues to a fave game", "Guess the game", "Give clues to a board game", "Guess the game",
  "Recommend them a book", "Guess why they chose it", "Pick a museum for our date", "Pick the cafe after",
  "Show your best photo", "Ask the story behind it", "Show a photo of your pet", "Guess its personality",
  "Share your happy place", "Ask why it's that one", "Share a cause you love", "Ask why it matters"];
// Nothing to share or split: the tag picks one from both IDs (the page shows the first)
const DATING_GAMES = ["Tell 2 truths and a lie", "Spot the lie", "Give 3 clues to your job", "Guess their job",
  "Recommend a hawker stall", "Guess what to order there", "Describe a lazy Sunday", "Guess what time they wake",
  "Name a green flag you love", "Say if you have it", "Tell your best dad joke", "Try not to laugh",
  "Give clues to your talent", "Guess it in 3 tries", "Dating me is like...", "Dating me is like...",
  "Together, we could...", "Together, we could...", "Your warning label says...", "Your warning label says...",
  "Teleport or read minds?", "Teleport or read minds?"];
const DATING_GOALS = ["Slow & steady", "See where it goes", "Friends first",
  "Manifestor", "Generator", "Manifesting Gen", "Projector", "Reflector"];
const DATING_INTENTS = 3;   // goal bits 0-2: what they're looking for (set in offer and seek); 3-7: Human Design type
const HD_TYPES = ["Manifestor", "Generator", "Manifesting Generator", "Projector", "Reflector"];
// One line each, in Human Design's own terms, for people who half-know their type
const HD_BLURBS = ["starts things", "steady energy, responds to what comes", "fast, many things at once",
  "a natural guide", "mirrors the room"];
// Which types each type pairs with (bit j = HD_TYPES[j]), sent as its seek bits. A draft to check with the organiser;
// only this page has it (sim/proximity_sim.cpp copies it for --profiles dating). Projectors guide Generators and
// Manifesting Generators; Manifestors start things those two respond to; Reflectors sample everyone.
const HD_PAIRS = [0b00110, 0b01001, 0b01001, 0b00110, 0b01111];
// First-date spots for mutual Baes (dateIdeas), from what both picked: a date partner (datePartners) where one fits,
// else one of these, with no perk (nothing is agreed with these venues). By DATING_INTERESTS bit: [emoji (unused),
// name, kind, area ("" = a chain: Maps finds the nearest), and true for a free public place (a park, a beach), which
// comes after the venues], several for some, none where there's no natural date spot; a reason line each
const DATE_IDEAS_LIVE = true;   // false: only the demo (?demo=1) shows them
const DATE_SPOTS = {
  0: [["🏃", "MacRitchie Reservoir", "Trail run", "Thomson", true]], 1: [["🥾", "Henderson Waves", "Southern Ridges walk", "Telok Blangah", true]],
  4: [["🧗", "Boulder Movement", "Bouldering", "Bugis"], ["🧗", "fit · bloc", "Bouldering", "Kent Ridge"]],
  5: [["🚲", "East Coast Park", "Bike rental", "East Coast", true]], 7: [["🍳", "Palate Sensations", "Cooking class", "Buona Vista"]],
  8: [["🥞", "Wild Honey", "Brunch", "Orchard"], ["🥐", "Tiong Bahru Bakery", "Brunch", "Tiong Bahru"]],
  9: [["☕", "Apartment Coffee", "Café", "Selegie Rd"], ["☕", "Nylon Coffee Roasters", "Café", "Everton Park"]],
  10: [["🍷", "Le Bon Funk", "Wine bar", "Club St"]], 11: [["✈️", "Jewel Changi", "Rain Vortex", "Changi", true]],
  12: [["🏖️", "Tanjong Beach", "Beach", "Sentosa", true]], 13: [["🎶", "Esplanade Outdoor Theatre", "Free shows Fri–Sun", "Marina Bay", true]],
  14: [["🎤", "Teo Heng KTV", "Karaoke", ""]], 15: [["🎬", "Golden Village", "Cinema", ""]], 16: [["🕹️", "Timezone", "Arcade", "Plaza Singapura"]],
  17: [["🎲", "Settlers Cafe", "Board game café", "Clarke Quay"]], 18: [["📚", "Kinokuniya", "Bookshop", "Ngee Ann City"]],
  19: [["🎨", "National Gallery Singapore", "Art museum", "City Hall"], ["🎨", "ArtScience Museum", "Museum", "Marina Bay"]],
  20: [["📷", "Supertree Grove", "Gardens by the Bay", "Marina Bay", true]], 22: [["🌿", "Singapore Botanic Gardens", "Garden walk", "Tanglin", true]],
  24: [["🥐", "Tiong Bahru Bakery", "Morning pastries", "Tiong Bahru"]], 25: [["🌙", "Jigger & Pony", "Late-night cocktails", "Tanjong Pagar"]],
  26: [["🐶", "Surrey Hills Grocer", "Dog-friendly café", "Holland Village"]], 27: [["🐱", "Catmosphere Cat Cafe", "Cat café", "Desker Rd"]],
  29: [["🍸", "Atlas", "Cocktail bar", "Bugis"], ["🍸", "Jigger & Pony", "Cocktail bar", "Tanjong Pagar"]],
};
DATE_SPOTS[28] = DATE_SPOTS[9];   // a coffee date: the cafés
const DATE_REASONS = { 0: "You both run", 1: "You both hike", 4: "You both climb", 5: "You both cycle", 7: "You both cook",
  8: "You both love brunch", 9: "You both love coffee", 10: "You both like wine", 11: "You both love to travel",
  12: "You both love the beach", 13: "You both love live music", 14: "You both sing", 15: "You both love movies",
  16: "You both game", 17: "You both play board games", 18: "You both read", 19: "You both love art",
  20: "You both take photos", 21: "You both love animals", 22: "You both like slowing down", 24: "You're both early birds", 25: "You're both night owls",
  26: "You're both dog people", 27: "You're both cat people", 28: "You both like coffee dates", 29: "You both like drinks dates" };
// Date partners: venues that agreed a perk for matched pairs, typed in by the team on the Partners tab (dating.partners
// in schema.sql, read with date_partners: live ones, public fields only). Only these carry a perk; a shared interest
// picks a partner before any DATE_SPOTS spot. interests: DATING_INTERESTS bits; book: the venue's booking page, or a
// wa.me link with its message (waLink), optional (else Map only, and Use opens the voucher); map: its Google Maps link,
// optional (else Map searches name and area); promo: a code the venue gave NexSwap couples, optional. This list is only
// used until the database has partners (the migration not run yet, or offline).
let datePartners = [
  { name: "The Cat Cafe", kind: "Café", area: "Bugis", interests: [27, 21], perk: "Free drink top-ups",
    claim: "Mention NexSwap when booking", book: "https://thecatcafe.sg", map: "", promo: "" },
];
// The Partners tab's fixed lists: save_partner in schema.sql checks against the same ones (keep them the same)
const PARTNER_KINDS = ["Café", "Bar", "Restaurant", "Activity", "Workshop", "Fitness", "Outdoors", "Culture"];
const PARTNER_AREAS = ["Ang Mo Kio", "Bedok", "Bishan", "Boat Quay", "Bugis", "Bukit Batok", "Bukit Merah",
  "Bukit Panjang", "Bukit Timah", "Buona Vista", "Changi", "Chinatown", "Choa Chu Kang", "City Hall", "Clarke Quay",
  "Clementi", "Dempsey", "Dhoby Ghaut", "East Coast", "Farrer Park", "Geylang", "Holland Village", "Hougang",
  "Islandwide", "Jalan Besar", "Joo Chiat / Katong", "Jurong", "Kallang", "Kampong Glam", "Little India", "Mandai",
  "Marina Bay", "Novena", "Orchard", "Pasir Panjang", "Pasir Ris", "Paya Lebar", "Pulau Ubin", "Punggol", "Queenstown",
  "Raffles Place", "River Valley", "Robertson Quay", "Sembawang", "Sengkang", "Sentosa", "Serangoon", "Tampines",
  "Tanjong Pagar", "Telok Ayer", "Thomson", "Tiong Bahru", "Toa Payoh", "Woodlands", "Yishun"];
const PROMO_CLAIM = "Use the promo code when booking";   // (save_partner: needs a promo code)
const MATCH_CLAIM = "Show your match screen";        // (the redeem card makes a code for staff: openVoucher)
const PARTNER_CLAIMS = ["Mention NexSwap when booking", "Mention NexSwap when you arrive", MATCH_CLAIM, PROMO_CLAIM];
// Rough middles of PARTNER_AREAS (keep them in step; not Islandwide), [lat, lng]: the area a Maps link's coordinates
// are nearest to (nearestArea)
const PARTNER_AREA_CENTRES = {
  "Ang Mo Kio": [1.3691, 103.8454], "Bedok": [1.3240, 103.9300],
  "Bishan": [1.3508, 103.8485], "Boat Quay": [1.2867, 103.8490], "Bugis": [1.3008, 103.8559],
  "Bukit Batok": [1.3590, 103.7637], "Bukit Merah": [1.2819, 103.8239], "Bukit Panjang": [1.3774, 103.7719],
  "Bukit Timah": [1.3294, 103.8021], "Buona Vista": [1.3071, 103.7903], "Changi": [1.3600, 103.9890],
  "Chinatown": [1.2836, 103.8443], "Choa Chu Kang": [1.3840, 103.7470], "City Hall": [1.2931, 103.8520],
  "Clarke Quay": [1.2906, 103.8465], "Clementi": [1.3151, 103.7652], "Dempsey": [1.3043, 103.8098],
  "Dhoby Ghaut": [1.2990, 103.8455], "East Coast": [1.3010, 103.9120], "Farrer Park": [1.3124, 103.8541],
  "Geylang": [1.3120, 103.8800], "Holland Village": [1.3113, 103.7958], "Hougang": [1.3712, 103.8920],
  "Jalan Besar": [1.3105, 103.8600], "Joo Chiat / Katong": [1.3080, 103.9020], "Jurong": [1.3330, 103.7420],
  "Kallang": [1.3100, 103.8710], "Kampong Glam": [1.3025, 103.8590], "Little India": [1.3066, 103.8518],
  "Mandai": [1.4043, 103.7930], "Marina Bay": [1.2820, 103.8585], "Novena": [1.3204, 103.8438],
  "Orchard": [1.3040, 103.8318], "Pasir Panjang": [1.2760, 103.7910], "Pasir Ris": [1.3721, 103.9474],
  "Paya Lebar": [1.3180, 103.8930], "Pulau Ubin": [1.4044, 103.9625], "Punggol": [1.4043, 103.9020],
  "Queenstown": [1.2942, 103.7861], "Raffles Place": [1.2840, 103.8515], "River Valley": [1.2950, 103.8350],
  "Robertson Quay": [1.2905, 103.8390], "Sembawang": [1.4491, 103.8185], "Sengkang": [1.3917, 103.8950],
  "Sentosa": [1.2494, 103.8303], "Serangoon": [1.3500, 103.8730], "Tampines": [1.3540, 103.9440],
  "Tanjong Pagar": [1.2765, 103.8455], "Telok Ayer": [1.2820, 103.8485], "Thomson": [1.3540, 103.8330],
  "Tiong Bahru": [1.2860, 103.8270], "Toa Payoh": [1.3343, 103.8563], "Woodlands": [1.4370, 103.7865],
  "Yishun": [1.4294, 103.8355] };
// A Google Maps link, as save_partner takes it
const MAP_LINK = /^https:\/\/(maps\.app\.goo\.gl|goo\.gl\/maps|maps\.google\.[a-z.]+|(www\.)?google\.[a-z.]+\/maps)[/?]\S*$/;
const PROMO_CODE = /^[A-Za-z0-9_-]{0,30}$/;   // (save_partner's check)
// A partner that books on WhatsApp: the team types the number and, if they want, a message; book is the wa.me link that
// opens a chat with it typed. Without a message the link has none, and Book types this, with the venue's name (bookHref)
const waText = name => `Hi${name ? " " + name : ""}, NexSwap sent me your way and I'd like to make a booking.`;
const BOOK_MAX = 300;   // (dating.partners.book's limit: a long message makes the link too long)
// The number as wa.me takes it, digits only: 8 Singapore digits get 65 in front; 10 to 15 already have a country code.
// "" when it's neither.
function waNumber(text) {
  const n = text.replace(/[\s()+-]/g, "");
  if (/^[3689]\d{7}$/.test(n)) return "65" + n;
  return /^\d{10,15}$/.test(n) ? n : "";
}
function waLink(number, text) {
  return `https://wa.me/${number}` + (text ? "?text=" + encodeURIComponent(text) : "");
}
// { number, text } from a wa.me link, else null
function parseWa(link) {
  const m = /^https:\/\/wa\.me\/(\d{8,15})\/?(\?.*)?$/.exec(link || "");
  return m && { number: m[1], text: new URLSearchParams(m[2] || "").get("text") || "" };
}
// Where a partner's Book goes: its link, and for a wa.me link without a message, with waText
function bookHref(idea) {
  const wa = parseWa(idea.book);
  return wa && !wa.text ? waLink(wa.number, waText(idea.name)) : idea.book;
}
// The place's [lat, lng] in a long Maps link (copied from a computer's address bar): its pin (!3d..!4d..), else where
// the map was (@lat,lng), else a q=lat,lng search. null when there's none (a short share link) or it isn't in Singapore.
function mapCoords(link) {
  let url = link;
  try { url = decodeURIComponent(link); } catch (err) {}
  const m = url.match(/!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/) || url.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/) ||
            url.match(/[?&](?:q|ll|query|center|destination)=(-?\d+\.\d+),\s*(-?\d+\.\d+)/);
  if (!m || !MAP_LINK.test(link)) return null;
  const at = [Number(m[1]), Number(m[2])];
  return at[0] > 1.15 && at[0] < 1.48 && at[1] > 103.6 && at[1] < 104.1 ? at : null;
}
// ('' when none is within about 3 km, 0.027 degrees: the team picks)
const nearestArea = at => Object.entries(PARTNER_AREA_CENTRES)
  .reduce((best, [area, c]) => { const d = (c[0] - at[0]) ** 2 + (c[1] - at[1]) ** 2; return d < best.d ? { area, d } : best; },
          { area: "", d: 0.027 ** 2 }).area;
const PARTNER_MAX_INTERESTS = 5;
// A partner's interests: one number of DATING_INTERESTS bits, as dating.profiles keeps them, as a list of bits
const interestBits = mask => DATING_INTERESTS.flatMap((_, i) => ((Number(mask) >>> i) & 1) === 1 ? [i] : []);
const DATE_FALLBACK = [["☕", "Apartment Coffee", "Café", "Selegie Rd"], ["🌳", "Gardens by the Bay", "Gardens", "Marina Bay", true]];
const IAM = ["Woman", "Man", "Non-binary", "Prefer not to say"];   // "who" bits 0-1: 1, 2, 3, 0
const OPEN = ["Women", "Men", "Non-binary people"];                // "who" bits 2-4 (none = everyone)
// Must match include/Proximity.c in the tag firmware
const SETUP_SERVICE = "0b2c1a00-6d2e-4c1f-9a3e-4e5853570001";
const SETUP_PROFILE = "0b2c1a00-6d2e-4c1f-9a3e-4e5853570002";
const SETUP_STATUS  = "0b2c1a00-6d2e-4c1f-9a3e-4e5853570003";
const SETUP_BUZZ    = "0b2c1a00-6d2e-4c1f-9a3e-4e5853570006";
const OTA_VERSION   = "0b2c1a00-6d2e-4c1f-9a3e-4e5853570007";
const OTA_CONTROL   = "0b2c1a00-6d2e-4c1f-9a3e-4e5853570008";
const OTA_DATA      = "0b2c1a00-6d2e-4c1f-9a3e-4e5853570009";

// The QR code on the tag opens this page with ?tag=<8-hex tag ID>&k=<6-hex one-time code>
const params = new URLSearchParams(location.search);
// ?demo=1 fills the Matches tab with sample people (drawn by the real rendering code), no sign-in, nothing saved
const DEMO = params.get("demo") === "1";
const DEMO_CARDS = {
  "demo-alex":  { first: "Alex", company: "Demo Co", title: "Head of Sales", linkedin: "https://www.linkedin.com/company/nexswap/",
                  email: "alex@example.com", photoURL: "", interests: 0x4001, offer: 0x05, seek: 0x10 },
  "demo-priya": { first: "Priya", company: "Orbit Labs", title: "Founder", linkedin: "https://www.linkedin.com/company/nexswap/",
                  photoURL: "", interests: 0x0804, offer: 0x08, seek: 0x02 },
};
const DEMO_ROWS = [{ uid: "demo-alex" }, { uid: "demo-priya" }, { uid: "demo-waiting" }];
// ?demo=1&e=d: dating sample people, demoDating() below
const TAG_ID = /^[0-9A-Fa-f]{8}$/.test(params.get("tag") || "") ? params.get("tag").toUpperCase() : "";
const SETUP_CODE = /^[0-9A-Fa-f]{6}$/.test(params.get("k") || "") ? params.get("k").toUpperCase() : "";
// The event the tag is set up for: its QR adds &ev=<id> (the console's events, firmware v2.2.6 and Apply), and the claim
// records it, so every registration belongs to an event. A tag link without it is from a tag that wasn't updated.
const EVENT_ID = /^[1-9][0-9]{0,8}$/.test(params.get("ev") || "") ? Number(params.get("ev")) : 0;
const TAG_OLD = "This tag needs an update before it can be set up. Ask an organiser.";
// A dating event: the tag's QR adds &e=d (its event type, set from the organiser's console). The dating form, a v2
// profile, and an optional account (dating.profiles in schema.sql, apart from business profiles). A link without it (a
// bookmark, Matches later) uses what the last link with a tag or e= said, so a profile saved without a tag opens again.
// A Human Design night adds &h=1 (the tag's "hd" setting): only then does the form ask for the type ("h" stored).
const KIND_KEY = "nexswap-kind";
let storedKind = null;
try { storedKind = localStorage.getItem(KIND_KEY); } catch (e) {}
const fromLink = !!TAG_ID || params.has("e");
const DATING = params.has("e") ? params.get("e") === "d" : !TAG_ID && (storedKind === "d" || storedKind === "h");
const HD_NIGHT = DATING && (fromLink ? params.get("h") === "1" : storedKind === "h");
if (fromLink) try { localStorage.setItem(KIND_KEY, HD_NIGHT ? "h" : DATING ? "d" : "b"); } catch (e) {}
document.querySelectorAll("[data-only]").forEach(el => el.hidden = el.dataset.only !== (DATING ? "dating" : "business"));
document.querySelectorAll("[data-hd]").forEach(el => el.hidden = !HD_NIGHT);
if (DATING) {
  document.getElementById("interests-legend").textContent = "Your hobbies";
  document.getElementById("goals-legend").textContent = "What are you looking for?";
  document.getElementById("goals-hint").textContent = HD_NIGHT
    ? "You match with people who share a hobby or quick pick with you, sooner if they're looking for the same or their type pairs with yours."
    : "You match with people who share a hobby or quick pick with you, sooner if they're looking for the same.";
  document.querySelectorAll(".sign .kicker").forEach(k => k.textContent = "HOPING TO MEET");
  document.querySelectorAll(".tagmock.sign").forEach(el => el.classList.add("dating"));   // big name, one-line hint
  document.getElementById("howto-looking").textContent = "Hoping to meet";
  HD_TYPES.forEach((t, i) => document.getElementById("hd").append(new Option(`${t}: ${HD_BLURBS[i]}`, i)));
  document.getElementById("matches-hint").textContent = "After the event: time to change any Bae or Nay, then the people you both said Bae to.";
  document.querySelector("#signed-out .hint").textContent = "Sign in to see your mutual Baes after the event.";
}

// value = bit (labels "" are unused bits); box and bits let a group hold some of the labels
function addChips(containerId, labels, type = "checkbox", box = document.getElementById(containerId), bits = labels.keys()) {
  for (const i of bits) {
    if (!labels[i]) continue;
    const el = document.createElement("label");
    el.className = "chip";
    el.innerHTML = `<input type="${type}" name="${containerId}" value="${i}"><span></span>`;
    el.querySelector("span").textContent = labels[i];
    box.appendChild(el);
  }
}
// Interests in labelled groups, not one wall of chips (display only: values are still the taxonomy bits). A label no
// group lists (after a taxonomy change) goes under "More" rather than disappearing. "and", not "&": Silkscreen draws
// "&" like "$".
const INTEREST_GROUPS = [
  ["Tech", [0, 4, 5, 8, 9, 10, 11, 24, 25, 26]],
  ["Industries", [1, 2, 3, 6, 7, 18, 19, 20, 21, 23, 27, 28, 29]],
  ["What you do", [15, 12, 13, 14]],
  ["Culture and causes", [22, 17, 16, 30, 31]],
];
const DATING_INTEREST_GROUPS = [
  ["Active", [0, 1, 2, 3, 4, 5, 6]],
  ["Food and drink", [7, 8, 9, 10]],
  ["Out and about", [11, 12, 13, 14, 15, 20, 23]],
  ["Cosy and creative", [16, 17, 18, 19, 21, 22]],
];
function addChipGroups(containerId, labels, groups) {
  const listed = new Set(groups.flatMap(([, bits]) => bits));
  const rest = [...labels.keys()].filter(i => labels[i] && !listed.has(i));
  for (const [title, bits] of rest.length ? [...groups, ["More", rest]] : groups) {
    const group = document.createElement("div");
    group.className = "chip-group";
    group.innerHTML = `<h3></h3><div class="chips"></div>`;
    group.querySelector("h3").textContent = title;
    document.getElementById(containerId).append(group);
    addChips(containerId, labels, "checkbox", group.querySelector(".chips"), bits);
  }
}
addChipGroups("interests", DATING ? DATING_INTERESTS.slice(0, DATING_PICK_FIRST) : INTERESTS,
              DATING ? DATING_INTEREST_GROUPS : INTEREST_GROUPS);
// Quick picks: one row per pair; picking one clears the other, tapping it again clears it (value = bit)
if (DATING) {
  const picks = document.getElementById("picks");
  for (let bit = DATING_PICK_FIRST; bit < 32; bit += 2) {
    const row = document.createElement("div");
    row.className = "chips pick-row";
    [bit, bit + 1].forEach(b => {
      const el = document.createElement("label");
      el.className = "chip";
      el.innerHTML = `<input type="checkbox" value="${b}"><span></span>`;
      el.querySelector("span").textContent = DATING_INTERESTS[b];
      row.appendChild(el);
    });
    picks.appendChild(row);
  }
  picks.addEventListener("change", e => {
    if (e.target.checked) e.target.closest(".pick-row").querySelectorAll("input").forEach(cb => { if (cb !== e.target) cb.checked = false; });
  });
}
addChips("offer", OFFER);
addChips("seek", SEEK);
if (DATING) {
  addChips("iam", IAM, "radio");
  addChips("open", OPEN);
  addChips("intent", DATING_GOALS.slice(0, DATING_INTENTS), "radio");
}

function mask(containerId) {
  let m = 0;
  document.querySelectorAll(`#${containerId} input:checked`).forEach(cb => { m |= 1 << Number(cb.value); });
  return m >>> 0;
}
const hex = (n, width) => n.toString(16).toUpperCase().padStart(width, "0");
const clean = s => s.replace(/\|/g, "/").trim();   // "|" separates fields in the payload

// v1 for business (tags on older firmware only take that); v2 adds the event kind and the dating "who" byte
function payload() {
  const p = formProfile();
  return (DATING ? ["v2", p.first, "", "", "", hex(p.interests, 8), hex(p.offer, 2), hex(p.seek, 2), "1", hex(p.who, 2)]
                 : ["v1", p.first, p.company, p.title, p.linkedin, hex(p.interests, 8), hex(p.offer, 2), hex(p.seek, 2)])
    .join("|");
}

// Remember the form on this phone so a re-write is quick (a dating profile apart from the business one)
let datingPhoto = "";   // dating: '' or the photo as a small JPEG data URL (makePhoto), kept with the form
// Added or removed on this phone since it was last saved to the account. Only then is it sent: a phone that never had
// it (another phone, another browser) loads it from the account instead of sending an empty one over it.
let photoChanged = false;
const FIELDS = ["first", "company", "title", "linkedin", "handle"];
const FORM_KEY = DATING ? "nexswap-profile-d" : "nexswap-profile";
const DATING_BOXES = ["iam", "open", "intent", "picks"];
function saveForm() {
  try {
    const data = { masks: [mask("interests"), mask("offer"), mask("seek")] };
    FIELDS.forEach(id => data[id] = document.getElementById(id).value);
    if (DATING) {
      DATING_BOXES.forEach(id => data[id] = mask(id));
      data.hd = Number(document.getElementById("hd").value);
      data.adult = document.getElementById("adult").checked;
      data.consent = document.getElementById("consent").checked;
      data.emails = document.getElementById("emails").checked;
      data.photo = datingPhoto;
      data.photoChanged = photoChanged;
    }
    localStorage.setItem(FORM_KEY, JSON.stringify(data));
  } catch (e) {}
}
function loadForm() {
  try {
    const data = JSON.parse(localStorage.getItem(FORM_KEY) || "null");
    if (!data) return;
    FIELDS.forEach(id => document.getElementById(id).value = data[id] || "");
    ["interests", "offer", "seek"].forEach((id, k) =>
      document.querySelectorAll(`#${id} input`).forEach(cb => cb.checked = !!(data.masks[k] & (1 << Number(cb.value)))));
    if (DATING) {
      DATING_BOXES.forEach(id =>
        document.querySelectorAll(`#${id} input`).forEach(cb => cb.checked = !!((data[id] || 0) & (1 << Number(cb.value)))));
      document.getElementById("hd").value = String(data.hd ?? -1);
      document.getElementById("adult").checked = !!data.adult;
      document.getElementById("consent").checked = !!data.consent;
      document.getElementById("emails").checked = data.emails !== false;
      datingPhoto = /^data:image\/jpeg;base64,/.test(data.photo || "") ? data.photo : "";
      photoChanged = !!data.photoChanged;
      showPhoto();
    }
  } catch (e) {}
}
loadForm();
document.getElementById("form").addEventListener("change", saveForm);

// ---------- dating photo (optional) ----------
// The picture, read as a data URL rather than a blob: link, which the page's content policy doesn't allow
function loadPicture(file) {
  return new Promise((ok, fail) => {
    const reader = new FileReader();
    reader.onerror = () => fail(new Error("couldn't read the file"));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => fail(new Error("not a picture this phone can open"));
      img.onload = () => ok(img);
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

// Made here, before it's saved: the square chosen in cropPhoto, 320 x 320, as a JPEG small enough for the account
// (at most 100,000 characters, dating.profiles in schema.sql). Drawing it again drops its location and camera details.
function makePhoto(img, { sx, sy, side }) {
  const size = 320;
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  canvas.getContext("2d").drawImage(img, sx, sy, side, side, 0, 0, size, size);
  for (const quality of [0.82, 0.7, 0.55, 0.4]) {
    const url = canvas.toDataURL("image/jpeg", quality);
    if (url.startsWith("data:image/jpeg;base64,") && url.length <= 95000) return url;
  }
  throw new Error("too big");
}

// The picture in a square to drag and zoom (pinch, the slider or a mouse wheel), full screen. Resolves with the square
// kept, in the picture's own pixels, or null for Cancel (or Escape). It starts as the middle square, fitted.
function cropPhoto(img) {
  return new Promise(done => {
    const box = document.getElementById("crop"), frame = document.getElementById("crop-frame");
    const view = document.getElementById("crop-img"), slider = document.getElementById("crop-zoom");
    const w = img.naturalWidth, h = img.naturalHeight, MAX_ZOOM = 4;
    box.hidden = false;
    const F = frame.clientWidth, fit = F / Math.min(w, h);   // the square's side on screen; the scale that fills it
    let zoom = 1, x = (F - w * fit) / 2, y = (F - h * fit) / 2;   // the picture's top left corner, in the square
    view.src = img.src;
    view.style.width = w + "px"; view.style.height = h + "px";
    // Never a gap: the picture always covers the square
    const draw = () => {
      const s = fit * zoom;
      x = Math.min(0, Math.max(F - w * s, x)); y = Math.min(0, Math.max(F - h * s, y));
      view.style.transform = `translate(${x}px, ${y}px) scale(${s})`;
      slider.value = zoom;
    };
    // Zoom keeping the point (cx, cy) of the square still: the middle, or between the fingers or under the mouse
    const zoomTo = (z, cx = F / 2, cy = F / 2) => {
      z = Math.min(MAX_ZOOM, Math.max(1, z));
      x = cx - (cx - x) * z / zoom; y = cy - (cy - y) * z / zoom; zoom = z;
      draw();
    };
    const at = e => { const r = frame.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; };
    const fingers = new Map();   // pointer id -> where it is in the square
    let spread = 0;              // two fingers: how far apart they were last time
    const stop = new AbortController(), opts = { signal: stop.signal };
    frame.addEventListener("pointerdown", e => { frame.setPointerCapture(e.pointerId); fingers.set(e.pointerId, at(e)); spread = 0; }, opts);
    frame.addEventListener("pointermove", e => {
      if (!fingers.has(e.pointerId)) return;
      const [px, py] = fingers.get(e.pointerId), p = at(e);
      fingers.set(e.pointerId, p);
      if (fingers.size === 1) { x += p[0] - px; y += p[1] - py; draw(); return; }
      const [a, b] = fingers.values(), d = Math.hypot(a[0] - b[0], a[1] - b[1]);
      if (spread) zoomTo(zoom * d / spread, (a[0] + b[0]) / 2, (a[1] + b[1]) / 2);
      spread = d;
    }, opts);
    for (const type of ["pointerup", "pointercancel"]) frame.addEventListener(type, e => { fingers.delete(e.pointerId); spread = 0; }, opts);
    frame.addEventListener("wheel", e => { e.preventDefault(); zoomTo(zoom * Math.exp(-e.deltaY / 300), ...at(e)); }, { ...opts, passive: false });
    slider.max = MAX_ZOOM;
    slider.addEventListener("input", () => zoomTo(+slider.value), opts);
    const finish = keep => {
      stop.abort();
      box.hidden = true;
      view.removeAttribute("src");
      const s = fit * zoom;
      done(keep ? { sx: -x / s, sy: -y / s, side: F / s } : null);
    };
    document.getElementById("crop-done").addEventListener("click", () => finish(true), opts);
    document.getElementById("crop-cancel").addEventListener("click", () => finish(false), opts);
    document.addEventListener("keydown", e => { if (e.key === "Escape") finish(false); }, opts);
    draw();
    document.getElementById("crop-done").focus();
  });
}

// The header's picture while signed in: at a dating event the photo added here (what matches see once it's saved),
// otherwise Google's
function showAvatar() {
  const avatar = document.getElementById("avatar");
  const src = !user ? "" : DATING && datingPhoto ? datingPhoto : userPhoto(user);
  avatar.hidden = !src;
  if (src) avatar.src = src;
}

// The form's preview, as matches see it: the photo with the first name over it, or "Add a photo"
function showPhoto() {
  showAvatar();
  const img = document.getElementById("photo-img"), name = document.getElementById("photo-name");
  if (datingPhoto) img.src = datingPhoto;
  else img.removeAttribute("src");
  name.textContent = document.getElementById("first").value.trim();
  document.getElementById("photo-tile").classList.toggle("has", !!datingPhoto);
  img.hidden = name.hidden = !datingPhoto;
  document.getElementById("photo-add").hidden = !!datingPhoto;
  document.getElementById("photo-pick").textContent = datingPhoto ? "Change photo" : "Choose a photo";
  document.getElementById("photo-remove").hidden = !datingPhoto;
}

// The camera button only where there's a phone camera to open (a computer would show a file chooser for both)
document.getElementById("photo-take").hidden = !matchMedia("(pointer: coarse)").matches;
const usePhoto = async e => {
  const file = e.target.files[0];
  e.target.value = "";                         // the same file can be picked again
  if (!file) return;
  try {
    const img = await loadPicture(file);
    const square = await cropPhoto(img);
    if (!square) return;                       // cancelled: keep the photo there was
    datingPhoto = makePhoto(img, square);
    photoChanged = true;
    setStatus("");
  } catch (err) {
    console.error(err);
    setStatus("Couldn't use that picture. Try another one (a JPEG or PNG works).", "err");
  }
  showPhoto();
  saveForm();
};
document.getElementById("photo-camera").addEventListener("change", usePhoto);
document.getElementById("photo-file").addEventListener("change", usePhoto);
document.getElementById("photo-remove").addEventListener("click", () => {
  datingPhoto = "";
  photoChanged = true;
  showPhoto();
  saveForm();
});
document.getElementById("first").addEventListener("input", showPhoto);

// ---------- dating handle (optional) ----------
// One handle, Instagram or Telegram, saved with the app it's for ("ig:name" or "tg:name", in #handle) so a mutual Bae
// gets a link that opens the app (copyHandle). One saved before that ("@name") still shows, to copy only.
const HANDLE_APPS = {
  ig: { name: "Instagram", url: "https://instagram.com/", ok: /^[A-Za-z0-9._]{1,30}$/,
        rule: "Instagram usernames are up to 30 letters, numbers, dots and underscores." },
  tg: { name: "Telegram", url: "https://t.me/", ok: /^[A-Za-z0-9_]{5,32}$/,
        rule: "Telegram usernames are 5 to 32 letters, numbers and underscores." },
};
const HANDLE_HINT = "Paste your profile link or type your username. Only people you both say Bae to see it, after the event. " +
                    "Never on your tag. Needs sign-in.";
function parseHandle(handle) {
  const m = /^(ig|tg):(.+)$/.exec(handle || "");
  return m ? { app: m[1], name: m[2] } : { app: "", name: (handle || "").replace(/^@/, "") };
}
const handleName = document.getElementById("handle-name"), handleHint = document.getElementById("handle-hint");
const handleApp = () => document.querySelector('input[name="handle-app"]:checked').value;
const pickHandleApp = app => { document.querySelector(`input[name="handle-app"][value="${app}"]`).checked = true; };

// What was typed or pasted, tidied: a profile link becomes its username (and picks the app); "@" and spaces go.
// A username that can't be right says so in the hint, but never stops Next.
function syncHandle() {
  let text = handleName.value.trim();
  const link = /^(?:https?:\/\/)?(?:www\.)?(instagram\.com|t\.me|telegram\.me)\/([^/?#\s]+)/i.exec(text);
  if (link) { text = link[2]; pickHandleApp(/^instagram/i.test(link[1]) ? "ig" : "tg"); }
  text = text.replace(/\s+/g, "").replace(/^@+/, "");
  if (text !== handleName.value) handleName.value = text;
  const app = handleApp(), bad = !!text && !HANDLE_APPS[app].ok.test(text);
  document.getElementById("handle").value = text ? `${app}:${text}` : "";
  handleHint.textContent = bad ? HANDLE_APPS[app].rule : HANDLE_HINT;
  handleHint.classList.toggle("bad", bad);
}
// The saved handle back into the app switch and the box (after loadForm)
function showHandle() {
  const { app, name } = parseHandle(document.getElementById("handle").value);
  if (app) pickHandleApp(app);
  handleName.value = name;
  handleHint.textContent = HANDLE_HINT;
  handleHint.classList.remove("bad");
}
handleName.addEventListener("input", syncHandle);
document.querySelectorAll('input[name="handle-app"]').forEach(r => r.addEventListener("change", syncHandle));
showHandle();

// The most choices a profile may have (Taxonomy.h MAX_INTERESTS / MAX_GOALS, sim/regress.py checks they agree): a tag
// refuses more, and other tags ignore a tag with more, so nobody matches everyone by ticking everything. The other
// chips stop at the limit; a profile saved before the limits can still be over, and sending stops it (overLimit).
// Dating needs no more: one "looking for" and one type are single choices, the quick picks one of each pair
const MAX_INTERESTS = 5, MAX_GOALS = 3;
const LIMITS = [["interests", MAX_INTERESTS, DATING ? "hobbies" : "interests", 2]].concat(DATING ? [] :
  [["offer", MAX_GOALS, "“I can offer” choices", 3], ["seek", MAX_GOALS, "“I'm looking for” choices", 3]]);
function limitChips() {
  for (const [id, max] of LIMITS) {
    const boxes = [...document.querySelectorAll(`#${id} input`)], full = boxes.filter(b => b.checked).length >= max;
    boxes.forEach(b => b.disabled = full && !b.checked);
  }
}
function overLimit() {   // { step, text } for the first group over its limit
  for (const [id, max, what, onStep] of LIMITS) {
    const n = document.querySelectorAll(`#${id} input:checked`).length;
    if (n > max) return { step: onStep, text: `You've picked ${n} ${what}. Untick ${n - max} to continue: a tag takes up to ${max}.` };
  }
  return null;
}
document.getElementById("form").addEventListener("change", limitChips);

const status = document.getElementById("status");
const button = document.getElementById("write");
function setStatus(text, kind) {
  status.textContent = text;
  status.className = `status ${kind || ""}`;
  status.hidden = !text;
}

const canSend = !!(TAG_ID && SETUP_CODE && navigator.bluetooth);
// No Web Bluetooth (iPhones): the tag's own Wi-Fi instead (include/WifiSetup.c in the tag firmware)
const canWifi = !!(TAG_ID && SETUP_CODE && !navigator.bluetooth);
const WIFI_PENDING = "nexswap-wifi-pending";   // { id } while the phone is off to the tag's Wi-Fi
if (TAG_ID && SETUP_CODE) {
  document.getElementById("tag-id").textContent = TAG_ID;
  document.getElementById("tag-banner").hidden = false;
  if (canWifi) document.getElementById("tag-how").textContent = "At the end you'll connect to its Wi-Fi.";
} else if (!navigator.bluetooth) {
  document.getElementById("unsupported").hidden = false;
}

// ---------- screen state: tabs, 3-step wizard for new profiles, one-tap summary for returning users ----------
const form = document.getElementById("form");
const backButton = document.getElementById("back");
let activeTab = "profile";   // "profile" | "matches" | "partners" (the team only)
let onTeam = false;          // the signed-in account is on the team list (is_team): the Partners tab shows
let mode = "wizard";        // "wizard" | "summary" | "howto" | "wifi"
let step = 1;
let howtoStep = 1;          // 1-4, the How it works cards
let wifiStep = 1;           // 1-3, the Wi-Fi send cards (iPhones)
const ONBOARDED = "nexswap-onboarded";   // set once How it works has been seen after a first send
let busy = false;
let tagLink = null;          // { device }: the tag this page last reached (reconnects without the chooser)
let buzzIdle = 0;
const buzzButton = document.getElementById("buzz-try"), matchButton = document.getElementById("match-try");

const hasProfile = () => !!document.getElementById("first").value.trim();
const primaryLabel = () => canSend || canWifi ? "Send to my tag" : "Save my profile";

// The name and company | title are on the badge preview above (renderPreview); the pills are everything else
function fillSummary() {
  const p = formProfile();
  const pills = document.getElementById("sum-pills");
  pills.replaceChildren();
  const add = (text, goal) => { const li = document.createElement("li"); li.textContent = text; if (goal) li.className = "goal"; pills.append(li); };
  if (DATING) {
    [DATING_GOALS.find((_, i) => i < DATING_INTENTS && p.offer & (1 << i)), HD_TYPES[hdType(p.offer)]]
      .forEach(t => { if (t) add(t, true); });
    DATING_INTERESTS.forEach((l, i) => { if (l && p.interests & (1 << i)) add(l); });
    return;
  }
  OFFER.forEach((l, i) => { if (p.offer & (1 << i)) add(l, true); });
  SEEK.forEach((l, i) => { if (p.seek & (1 << i)) add(l, true); });
  INTERESTS.forEach((l, i) => { if (p.interests & (1 << i)) add(l); });
}

function render() {
  if (activeTab === "partners" && !onTeam) activeTab = "profile";
  const onProfile = activeTab === "profile", onMatches = activeTab === "matches", onPartners = activeTab === "partners";
  document.getElementById("view-profile").hidden = !onProfile;
  document.getElementById("matches-section").hidden = !onMatches;
  document.getElementById("partners-section").hidden = !onPartners;
  document.getElementById("tab-profile").setAttribute("aria-selected", onProfile);
  document.getElementById("tab-matches").setAttribute("aria-selected", onMatches);
  document.getElementById("tab-partners").setAttribute("aria-selected", onPartners);
  document.getElementById("tab-partners").hidden = !onTeam;
  document.getElementById("matches-signin").hidden = !onMatches || !!user || DEMO;
  document.getElementById("demo-banner").hidden = !DEMO;
  if (onMatches && !user && !DEMO) { document.getElementById("match-list").replaceChildren(); }
  if (onMatches) markMatchesSeen();

  const wifiLast = mode === "wifi" && wifiStep === 3;
  button.hidden = !onProfile || wifiLast;          // on the last Wi-Fi card the link is the action
  document.getElementById("wifi-go").hidden = !onProfile || !wifiLast;
  const howto = mode === "howto";
  backButton.hidden = !onProfile || mode === "summary" || (howto ? howtoStep === 1 : mode === "wizard" && step === 1);
  if (!onProfile) return;

  document.getElementById("summary").hidden = mode !== "summary";
  document.getElementById("wifi-send").hidden = mode !== "wifi";
  document.getElementById("update-tag").hidden = !navigator.bluetooth || !myTag;
  form.hidden = mode !== "wizard";
  document.getElementById("howto").hidden = !howto;
  // Setup banners and privacy notes are about sending a profile, not about the walkthrough
  ["tag-banner", "unsupported", "privacy"].forEach(id => document.getElementById(id).classList.toggle("howto-off", howto));
  // Sign-in card: only where it helps (first step, or above a returning user's summary), not on every step. Above the
  // summary, not under it: the summary looks like an account page, and someone not signed in took it for one and never
  // scrolled to the button (2026-10-18)
  const signedOut = document.getElementById("signed-out");
  signedOut.hidden = !!user || howto || (mode === "wizard" && step > 1);
  if (mode === "summary") fillSummary();
  if (mode === "summary" || mode === "wizard") renderPreview();
  document.querySelectorAll(".step").forEach(f => f.hidden = Number(f.dataset.step) !== step);
  document.getElementById("step-label").textContent = `Step ${step} of 3`;
  document.querySelectorAll("#stepper .dots i").forEach((d, i) => d.classList.toggle("on", i === step - 1));
  if (howto) renderHowto();
  else stopSign();
  if (mode === "wifi") renderWifi();
  if (!busy) button.textContent = howto ? (howtoStep === 4 ? "Got it" : "Next") : mode === "wifi" ? "Next"
                                        : mode === "summary" || step === 3 ? primaryLabel() : "Next";
}

// ---------- live preview (wizard and summary) ----------
// The tag's name badge as it will look. On steps 2-3, a match's tag naming you with the reason it would give
// (signReason, as on card 3), so picking interests and goals changes what's shown. Placeholders in grey until filled.
function renderPreview() {
  const p = formProfile(), sign = mode === "wizard" && step > 1;
  const fill = (box, sel, text, placeholder) => box.querySelectorAll(sel).forEach(el => {
    el.textContent = text || placeholder;
    el.classList.toggle("empty", !text);
  });
  document.querySelectorAll(".preview").forEach(box => {
    fill(box, "[data-me-name]", p.first, "Your name");
    // (roughly the tag's choice by width: the name at 64 px up to ~7 letters, then 48, then 36)
    box.querySelectorAll("[data-me-name]").forEach(el => {
      el.classList.toggle("mid", (p.first || "Your name").length > 7);
      el.classList.toggle("long", (p.first || "Your name").length > 9);
    });
    // As on the tag: company | title, nothing at a dating event (a no-break space keeps the line's height)
    fill(box, "[data-me-sub]", [p.company, p.title].filter(Boolean).join("  |  "), DATING ? " " : "Company  |  Role");
    fill(box, "[data-me-why]", signReason(samplePartner(p), p), DATING ? "Your hobbies" : "Your goals and interests");
    fill(box, "[data-me-opener]", signStarter(samplePartner(p), p), "");
    const badge = box.querySelector('[data-preview="badge"]'), signEl = box.querySelector('[data-preview="sign"]');
    if (signEl) { badge.hidden = sign; signEl.hidden = !sign; }
    const cap = box.querySelector("[data-preview-cap]");
    if (cap) cap.textContent = sign ? "Their tag when you match" : "Your tag";
  });
}
// After the quick-picks handler (on #picks, nearer the input) has cleared the other half of a pair
form.addEventListener("input", renderPreview);
form.addEventListener("change", renderPreview);

// ---------- How it works ----------
// The badge mocks use the person's own profile: card 1-2 show their name badge, card 3 their tag and a sample
// match's (card 4's person), each naming the other. The colours and four looks are the tag firmware's (Proximity.c GLOW_COLORS, ui_Screen2.c).
const GLOW = ["#ff8a00", "#22d3ee", "#f472b6", "#a3e635", "#facc15", "#60a5fa", "#c084fc", "#f87171"];
const SAMPLE_NAME = DATING ? "Sam" : "Alex";   // card 3's and card 4's sample match
const reduceMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;
let signTimers = [];

// The person's own name badge in the How it works and Wi-Fi card mocks
function fillMe(root, p) {
  const name = p.first || "You";
  root.querySelectorAll("[data-me-name]").forEach(el => {
    el.textContent = name;
    el.classList.toggle("mid", el.classList.contains("big") && name.length > 7);
    el.classList.toggle("long", el.classList.contains("big") && name.length > 9);
  });
  // As on the tag: company | title, nothing at a dating event (a no-break space keeps the line's height)
  root.querySelectorAll("[data-me-sub]").forEach(el => el.textContent = [p.company, p.title].filter(Boolean).join("  |  ") || "\u00a0");
}

function renderHowto() {
  const p = formProfile();
  fillMe(document.getElementById("howto"), p);
  // Card 3: my tag naming them and theirs naming me; card 4: them in my list, with their role. Nothing picked yet:
  // sample wording (business: they sell, as samplePartner says; dating: a hint and an iceBaeker pair, line A on my tag
  // and line B on theirs)
  const them = samplePartner(p), sample = DATING ? "Both night owls" : "Selling | AI, Fintech";
  document.querySelectorAll("[data-them-name]").forEach(el => el.textContent = SAMPLE_NAME);
  if (them.role) document.querySelectorAll("[data-them-role]").forEach(el => el.textContent = them.role);
  document.getElementById("why-mine").textContent = signReason(p, them) || sample;
  document.getElementById("why-theirs").textContent = signReason(them, p) || (DATING ? sample : "AI, Fintech");
  document.querySelectorAll("#howto [data-opener]").forEach(el => {
    const lineA = el.dataset.opener === "mine";
    el.textContent = signReason(p, them) ? signStarter(p, them, lineA)
      : DATING ? DATING_PICK_GAMES[2 + !lineA] : "";   // Night owl's pair
  });
  document.querySelectorAll("[data-sample-why]").forEach(el => {
    el.dataset.sampleWhy ||= el.textContent;
    el.textContent = matchReason(them) || el.dataset.sampleWhy;
  });
  document.querySelectorAll(".howto-step").forEach(el => el.hidden = Number(el.dataset.howto) !== howtoStep);
  document.getElementById("howto-label").textContent = `${howtoStep} of 4`;
  document.querySelectorAll("#howto .dots i").forEach((d, i) => d.classList.toggle("on", i === howtoStep - 1));
  document.getElementById("howto-signin").hidden = !!user;
  if (howtoStep === 3) startSign(); else stopSign();
  buzzButton.hidden = matchButton.hidden = !navigator.bluetooth || !myTag?.code;
  if (howtoStep !== 2 && howtoStep !== 3) buzzDisconnect();
}

// Card 3: both tags go through the four looks together: waiting for the other's answer, then the names fade in
function startSign() {
  if (signTimers.length) return;
  const signs = [...document.querySelectorAll("#howto .sign")];
  let look = 0;
  const show = () => {
    signs.forEach(sign => {
      sign.className = `tagmock sign look-${look}`;
      sign.style.setProperty("--glow", GLOW[look * 2]);   // orange, pink, yellow, violet
      if (reduceMotion()) return;
      sign.classList.add("waiting");
      sign.querySelector(".big").classList.remove("fadein");
    });
    if (reduceMotion()) return;
    signTimers.push(setTimeout(() => signs.forEach(sign => {
      const big = sign.querySelector(".big");
      sign.classList.remove("waiting"); void big.offsetWidth; big.classList.add("fadein");
    }), 1200));
  };
  show();
  if (!reduceMotion()) signTimers.push(setInterval(() => { look = (look + 1) % 4; show(); }, 4200));
  else signTimers.push(0);
}

function stopSign() {
  signTimers.forEach(t => { clearTimeout(t); clearInterval(t); });
  signTimers = [];
}

function openHowto() {
  mode = "howto";
  howtoStep = 1;
  render();
  window.scrollTo(0, 0);
}

function finishHowto() {
  try { localStorage.setItem(ONBOARDED, "1"); } catch (e) {}
  buzzDisconnect();
  mode = hasProfile() ? "summary" : "wizard";
  step = 1;
  setStatus("");
  render();
  window.scrollTo(0, 0);
}

function howtoGo(next) {
  if (next ? howtoStep >= 4 : howtoStep <= 1) return false;
  howtoStep += next ? 1 : -1;
  setStatus("");
  render();
  window.scrollTo(0, 0);
  slideIn(document.querySelector(`.howto-step[data-howto="${howtoStep}"]`), next);
  return true;
}

// ---------- Wi-Fi send (iPhones): three cards, then the bar's Send to my tag link ----------
function renderWifi() {
  fillMe(document.getElementById("wifi-send"), formProfile());
  document.querySelectorAll(".wifi-step").forEach(el => el.hidden = Number(el.dataset.wifi) !== wifiStep);
  document.getElementById("wifi-label").textContent = `Step ${wifiStep} of 3`;
  document.querySelectorAll("#wifi-send .dots i").forEach((d, i) => d.classList.toggle("on", i === wifiStep - 1));
}

function wifiGo(next) {
  if (next ? wifiStep >= 3 : wifiStep <= 1) return false;
  wifiStep += next ? 1 : -1;
  render();
  window.scrollTo(0, 0);
  slideIn(document.querySelector(`.wifi-step[data-wifi="${wifiStep}"]`), next);
  return true;
}

function setBusy(on, label) {
  busy = on;
  button.disabled = on;
  if (on) button.innerHTML = `<span class="spinner" aria-hidden="true"></span>${label}`;
  render();
}

function updateInterestCount() {
  const n = document.querySelectorAll("#interests input:checked").length;
  document.getElementById("interest-count").textContent =
    n === 0 ? "0 selected" : n < 3 ? `${n} selected, pick a few more`
    : n > MAX_INTERESTS ? `${n} selected: untick ${n - MAX_INTERESTS}, a tag takes up to ${MAX_INTERESTS}`
    : n === MAX_INTERESTS ? `${n} selected, that's the most` : `${n} selected`;
}
document.getElementById("interests").addEventListener("change", updateInterestCount);

document.getElementById("tab-profile").addEventListener("click", () => { activeTab = "profile"; render(); });
document.getElementById("tab-matches").addEventListener("click", () => {
  activeTab = "matches"; render();
  if (DATING && dating.done.length) showReveals(dating.done);   // (a mutual Bae not revealed on this phone yet)
});
document.getElementById("tab-partners").addEventListener("click", () => { activeTab = "partners"; setStatus(""); render(); });
document.getElementById("edit").addEventListener("click", () => { mode = "wizard"; step = 1; render(); window.scrollTo(0, 0); });

// ---------- the Partners tab: the team types in date partners (schema.sql: is_team, team_partners, save_partner) ----------
// Only for accounts on the team list. The database checks the list again on every call, so hiding the tab from everyone
// else is tidiness, not the lock. Each field comes from a fixed list where it can (PARTNER_KINDS, PARTNER_AREAS,
// PARTNER_CLAIMS, the dating interests), and save_partner checks them again.
let teamPartners = [];   // every partner with every field, newest change first (team_partners)
let editingPartner = null;   // the partner open in the form ({} for a new one), or null for the list
// ?demo=1&team=1: the tab with a sample list, signed out; saves and deletes change only this page, nothing is sent
const DEMO_TEAM = DEMO && params.get("team") === "1";
// (the demo's list also stands in for the database's on the demo Matches tab, photos and all)
function useDemoPartners() {
  datePartners = teamPartners.filter(x => x.live).map(x => ({ ...x, interests: interestBits(x.interests) }));
  if (DATING && dating.demo) drawDating();
}
const DEMO_PARTNERS = [{ id: 1, name: "The Cat Cafe", kind: "Café", area: "Bugis", interests: 2 ** 27 + 2 ** 21,
  perk: "Free drink top-ups", claim: "Mention NexSwap when booking", book: "https://thecatcafe.sg", map: "", promo: "",
  live: true, contact_name: "Jefferson Soh", contact_phone: "", notes: "Sample: the demo saves nothing" }];
let partnerPhoto = null;   // a photo chosen or removed ('') in the form; null: the partner's own, unchanged
const partnerForm = document.getElementById("partner-form");
const pField = id => document.getElementById("p-" + id);

function fillSelect(select, labels, prompt) {
  select.replaceChildren(new Option(prompt, ""), ...labels.map(l => new Option(l, l)));
}
fillSelect(pField("kind"), PARTNER_KINDS, "Choose a type");
fillSelect(pField("area"), PARTNER_AREAS, "Choose an area");
fillSelect(pField("claim"), PARTNER_CLAIMS, "Choose how");
addChips("p-interests", DATING_INTERESTS);
const partnerBits = () => [...document.querySelectorAll("#p-interests input:checked")].map(b => Number(b.value));
function limitPartnerChips() {
  const full = partnerBits().length >= PARTNER_MAX_INTERESTS;
  document.querySelectorAll("#p-interests input").forEach(b => b.disabled = full && !b.checked);
}

// The tab shows after sign-in when the database says this account is on the team
async function checkTeam() {
  if (DEMO_TEAM) {
    onTeam = true;
    if (!teamPartners.length) teamPartners = DEMO_PARTNERS.map(p => ({ ...p }));
    activeTab = "partners";
    render();
    drawPartners();
    return;
  }
  const { data, error } = user ? await supabase.rpc("is_team") : { data: false };
  if (error) console.warn("Team check failed:", error.message);   // (the migration not run yet: no Partners tab)
  onTeam = data === true;
  render();
  if (onTeam) loadTeamPartners();
}

async function loadTeamPartners() {
  const { data, error } = await supabase.rpc("team_partners");
  if (error) { setStatus(`Couldn't load the partners: ${error.message}`, "err"); return; }
  teamPartners = data;
  drawPartners();
}

function drawPartners() {
  document.getElementById("partner-list-view").hidden = !!editingPartner;
  partnerForm.hidden = !editingPartner;
  if (editingPartner) return;
  const list = document.getElementById("partner-list");
  list.replaceChildren();
  if (!teamPartners.length) list.append(el("li", "empty", "No partners yet."));
  // Two lines each: the name (and Live or Paused), then who to talk to there. Tap to see and edit the rest.
  for (const p of teamPartners) {
    const li = el("li", p.live ? "p-item" : "p-item paused"), row = el("button", "p-row"), head = el("span", "p-head");
    row.type = "button";
    row.setAttribute("aria-label", `Edit ${p.name}`);
    row.addEventListener("click", () => openPartner(p));
    head.append(el("strong", "", p.name), el("span", "p-state", p.live ? "Live" : "Paused"));
    row.append(head, el("span", "p-contact", [p.contact_name, p.contact_phone].filter(Boolean).join(" · ") || "No contact yet"));
    li.append(row);
    list.append(li);
  }
}

function openPartner(p) {
  editingPartner = p;
  document.getElementById("partner-form-title").textContent = p.id ? `Edit ${p.name}` : "New partner";
  pField("name").value = p.name || "";
  pField("kind").value = p.kind || "";
  pField("area").value = p.area || "";
  const bits = interestBits(p.interests || 0);
  document.querySelectorAll("#p-interests input").forEach(b => b.checked = bits.includes(Number(b.value)));
  pField("perk").value = p.perk || "";
  pField("claim").value = p.claim || "";
  const wa = parseWa(p.book);   // (how they book: from the link)
  pField("book-how").value = wa ? "wa" : p.book ? "link" : "";
  pField("book").value = wa ? "" : p.book || "";
  pField("book-wa").value = !wa ? "" : wa.number.startsWith("65") && wa.number.length === 10
    ? `+65 ${wa.number.slice(2, 6)} ${wa.number.slice(6)}` : "+" + wa.number;
  pField("book-text").value = wa && wa.text !== waText(p.name) ? wa.text : "";   // (empty: the default)
  showBookFields();
  pField("map").value = p.map || "";
  pField("map-note").hidden = true;
  pField("promo").value = p.promo || "";
  pField("live").checked = p.live ?? true;
  pField("contact-name").value = p.contact_name || "";
  pField("contact-phone").value = p.contact_phone || "";
  pField("notes").value = p.notes || "";
  pField("delete").hidden = !p.id;
  partnerPhoto = null;
  showPartnerPhoto();
  limitPartnerChips();
  previewPartner();
  setStatus("");
  drawPartners();
  window.scrollTo(0, 0);
}

// The form as save_partner takes it; interests as one number of bits, as dating.profiles keeps them. The photo only
// when it changed (save_partner keeps the old one otherwise)
function partnerFromForm() {
  return { ...(partnerPhoto === null ? {} : { photo: partnerPhoto }), name: pField("name").value.trim(), kind: pField("kind").value, area: pField("area").value,
           interests: partnerBits().reduce((mask, b) => mask + 2 ** b, 0), perk: pField("perk").value.trim(),
           claim: pField("claim").value, book: bookFromForm(), map: pField("map").value.trim(),
           promo: pField("promo").value.trim(), live: pField("live").checked,
           contact_name: pField("contact-name").value.trim(), contact_phone: pField("contact-phone").value.trim(),
           notes: pField("notes").value.trim() };
}

// How couples book, as the book link: the URL, the wa.me link (built from the number and message, none for the
// default; "" when the number isn't one), or "" for no booking
function bookFromForm() {
  const how = pField("book-how").value, number = waNumber(pField("book-wa").value);
  const text = pField("book-text").value.trim();
  if (how === "wa") return number ? waLink(number, text === waText(pField("name").value.trim()) ? "" : text) : "";
  return how === "link" ? pField("book").value.trim() : "";
}

// Only the fields for how couples book; under WhatsApp's, the default message (in grey in an empty box) and the link
// couples get
function showBookFields() {
  const how = pField("book-how").value, typed = pField("book-wa").value.trim();
  pField("book-link-field").hidden = how !== "link";
  pField("book-wa-fields").hidden = how !== "wa";
  pField("book-text").placeholder = waText(pField("name").value.trim());
  const link = pField("book-wa-link");
  const tooLong = !!waNumber(typed) && bookFromForm().length > BOOK_MAX;
  link.classList.toggle("bad", (!!typed && !waNumber(typed)) || tooLong);
  link.textContent = !typed ? "Type the number and the link is made for you."
                   : !waNumber(typed) ? "That isn't a WhatsApp number: 8 digits, or + and the country code."
                   : tooLong ? "Message too long: make it shorter."
                   : bookHref({ book: bookFromForm(), name: pField("name").value.trim() });
}

// The partner as a matched couple would see it (dateIdeasBox), redrawn as the form changes. Map and Book open the links
// in a new tab, to check them; the perk and Use are off here (Preview the redeem card does that)
function previewPartner() {
  const p = partnerFromForm(), bits = partnerBits();
  pField("preview").replaceChildren(dateIdeasBox([{ name: p.name || "Venue name", kind: p.kind || "Type", area: p.area,
    why: DATE_REASONS[bits[0]] || "Something you both like", perk: p.perk || "Your perk", claim: p.claim,
    book: /^https:\/\/\S+$/.test(p.book) ? p.book : "",
    map: MAP_LINK.test(p.map) ? p.map : "", promo: p.promo, partner: true }], "First date idea", null));
  pField("preview").querySelectorAll(".d-perk-use, .d-perk[role=button]").forEach(b => {
    b.tabIndex = -1;
    b.removeAttribute("role");
    if (b.matches(".d-perk-use")) b.setAttribute("aria-hidden", "true");
  });
}

// The venue photo: the one in the form, else the partner's own
const VENUE_PHOTO = /^data:image\/jpeg;base64,[A-Za-z0-9+/]+=*$/;
const formPhoto = () => partnerPhoto ?? editingPartner?.photo ?? "";
function showPartnerPhoto() {
  const img = pField("photo-img"), photo = formPhoto();
  img.hidden = !VENUE_PHOTO.test(photo);
  if (!img.hidden) img.src = photo;
  pField("photo-remove").hidden = img.hidden;
  pField("photo-pick").textContent = img.hidden ? "Choose a photo" : "Change photo";
}
// Redrawn here: longest side 720 px, a JPEG under the database's 150,000 characters (dating.partners.photo). Not
// cropped: the redeem card shows the middle of it (object-fit: cover). Drawing it again drops location details.
function makeVenuePhoto(img) {
  const scale = Math.min(1, 720 / Math.max(img.naturalWidth, img.naturalHeight));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(img.naturalWidth * scale);
  canvas.height = Math.round(img.naturalHeight * scale);
  canvas.getContext("2d").drawImage(img, 0, 0, canvas.width, canvas.height);
  for (const quality of [0.8, 0.7, 0.6, 0.5, 0.4]) {
    const url = canvas.toDataURL("image/jpeg", quality);
    if (VENUE_PHOTO.test(url) && url.length <= 140000) return url;
  }
  throw new Error("too big");
}
pField("photo-file").addEventListener("change", async e => {
  const file = e.target.files[0];
  e.target.value = "";
  if (!file) return;
  try {
    partnerPhoto = makeVenuePhoto(await loadPicture(file));
    setStatus("");
  } catch (err) {
    console.error(err);
    setStatus("Couldn't use that picture. Try another one (a JPEG or PNG works).", "err");
  }
  showPartnerPhoto();
});
pField("photo-remove").addEventListener("click", () => { partnerPhoto = ""; showPartnerPhoto(); });
// The Maps link: a long one has the place's coordinates, so the area fills in from them (and can still be changed); a
// short share link (maps.app.goo.gl) has none, so the team picks it. (Before the form's own input listener: the preview
// shows the new area.)
pField("map").addEventListener("input", () => {
  const link = pField("map").value.trim(), note = pField("map-note"), at = mapCoords(link);
  note.hidden = !link;
  const area = at && nearestArea(at);
  if (area) {
    pField("area").value = area;
    note.textContent = `Area set to ${area} from the link. Change it below if it's wrong.`;
  } else if (at) {
    note.textContent = "No area on the list is close to this place: pick the nearest below.";
  } else {
    note.textContent = MAP_LINK.test(link) ? "This link has no location in it (a short share link): pick the area below."
                                           : "That isn't a Google Maps link.";
  }
});
// The real redeem card with what's in the form, and a sample match
pField("voucher").addEventListener("click", () => {
  const p = partnerFromForm();
  openVoucher({ name: p.name || "Venue name", perk: p.perk || "Your perk", claim: p.claim, promo: p.promo, photo: formPhoto() },
              { first: "Sam", tagId: "preview" });   // (a sample match)
});

partnerForm.addEventListener("input", () => { limitPartnerChips(); showBookFields(); previewPartner(); });
document.getElementById("partner-add").addEventListener("click", () => openPartner({}));
pField("cancel").addEventListener("click", () => { editingPartner = null; setStatus(""); drawPartners(); });
partnerForm.addEventListener("submit", async e => {
  e.preventDefault();
  const save = pField("save");
  if (pField("book-how").value === "wa" && !waNumber(pField("book-wa").value)) {
    setStatus("Type the venue's WhatsApp number, e.g. 9123 4567.", "err");
    return;
  }
  if (bookFromForm().length > BOOK_MAX) { setStatus("The WhatsApp message is too long: make it shorter.", "err"); return; }
  if (DEMO_TEAM) {   // (only the gaps the database would refuse: the demo can't ask it)
    const p = partnerFromForm();
    if (!p.name || !p.kind || !p.area || !p.interests || !p.perk || !p.claim) {
      setStatus("Demo: fill in the name, type, area, 1 to 3 interests, perk and how to claim it.", "err");
      return;
    }
    if (p.map && !MAP_LINK.test(p.map)) { setStatus("Demo: the map link must be a Google Maps link.", "err"); return; }
    if (!PROMO_CODE.test(p.promo)) {
      setStatus("Demo: the promo code: up to 30 letters, numbers, - or _, no spaces.", "err");
      return;
    }
    if (p.claim === PROMO_CLAIM && !p.promo) {
      setStatus("Demo: type the promo code, or pick another way to claim it.", "err");
      return;
    }
    const id = editingPartner.id ?? Math.max(0, ...teamPartners.map(x => x.id)) + 1;
    teamPartners = [{ ...p, photo: formPhoto(), id }, ...teamPartners.filter(x => x.id !== id)];
    setStatus(`Demo: ${p.name} saved on this page only.`, "ok");
    editingPartner = null;
    drawPartners();
    useDemoPartners();
    return;
  }
  save.disabled = true;
  // The database checks every field and says what's wrong (save_partner)
  const { error } = await supabase.rpc("save_partner", { p_id: editingPartner.id ?? null, p_partner: partnerFromForm() });
  save.disabled = false;
  if (error) { setStatus(`Couldn't save: ${error.message}`, "err"); return; }
  setStatus(`Saved ${pField("name").value.trim()}.`, "ok");
  editingPartner = null;
  partnersLoaded = null;   // (the matches screen loads the new list)
  await loadTeamPartners();
});
pField("delete").addEventListener("click", async () => {
  const p = editingPartner;
  if (!p?.id || !confirm(`Delete ${p.name} for good? To hide it for now, untick Live instead.`)) return;
  if (DEMO_TEAM) {
    teamPartners = teamPartners.filter(x => x.id !== p.id);
    setStatus(`Demo: ${p.name} deleted on this page only.`, "ok");
    editingPartner = null;
    drawPartners();
    useDemoPartners();
    return;
  }
  const { error } = await supabase.rpc("delete_partner", { p_id: p.id });
  if (error) { setStatus(`Couldn't delete: ${error.message}`, "err"); return; }
  setStatus(`Deleted ${p.name}.`, "ok");
  editingPartner = null;
  partnersLoaded = null;
  await loadTeamPartners();
});
document.getElementById("howto-open").addEventListener("click", openHowto);
document.getElementById("howto-skip").addEventListener("click", finishHowto);
backButton.addEventListener("click", () => {
  if (mode === "howto") { howtoGo(false); return; }
  if (mode === "wifi") { if (!wifiGo(false)) { mode = "summary"; setStatus(""); render(); } return; }
  step = Math.max(1, step - 1); render(); window.scrollTo(0, 0);
});

// ---------- company guess from a work email ----------
// alex@stripe.com -> "Stripe", jo@nus.edu.sg -> "NUS"; personal mail providers give nothing
const PERSONAL_MAIL = /^(gmail|googlemail|outlook|hotmail|live|msn|yahoo|ymail|icloud|me|mac|aol|proton|protonmail|pm|gmx|mail|yandex|zoho|qq|163|126|singnet|starhub|pacific|fastmail|hey|tutanota)\./;
const SECOND_LEVEL = new Set(["co", "com", "edu", "gov", "org", "net", "ac"]);

function companyFromEmail(email) {
  const domain = (email || "").split("@")[1]?.toLowerCase();
  if (!domain) return "";
  const labels = domain.split(".");
  if (labels.length < 2) return "";
  // skip country second-level suffixes like .com.sg / .co.uk / .edu.sg
  let i = labels.length - 2;
  if (labels.length >= 3 && SECOND_LEVEL.has(labels[i]) && labels[labels.length - 1].length === 2) i--;
  const name = labels[i];
  // check the registrable domain (nexswap.co), not subdomains like mail.nexswap.co
  if (!name || PERSONAL_MAIL.test(labels.slice(i).join(".") )) return "";
  if (name.length <= 3) return name.toUpperCase();
  return name.split("-").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ").slice(0, 47);
}

// ---------- my tag (remembered after the first send) ----------
// { id: "501BAC1B", code: 16 hex }: for "Update my tag", and the walkthrough code the tag gave this phone when it
// took the profile (only the buzz and sample match below; "" after a send over Wi-Fi). (Pages before the console
// synced tags kept an owner key here instead: dropped on load.)
let myTag = null;
function rememberTag(id, code = "") {
  myTag = { id, code };
  try { localStorage.setItem("nexswap-tag", JSON.stringify(myTag)); } catch (e) {}
}
try {
  const saved = JSON.parse(localStorage.getItem("nexswap-tag") || "null");
  if (saved && saved.id) {
    myTag = { id: saved.id, code: /^[0-9A-F]{16}$/.test(saved.code || "") ? saved.code : "" };
    if (saved.ownerKey) rememberTag(myTag.id, myTag.code);
  }
} catch (e) {}
// ---------- Walkthrough cards 2 and 3: the tag itself plays the match buzz / a sample match sign ----------
// Only the phone that sent the profile: the tag checks the walkthrough code it gave it (include/Proximity.c), any time
// until the tag gets a new profile or is reset. While the phone is connected the tag stops advertising (no matching),
// so the connection is dropped a few seconds after the last tap.
function buzzDisconnect() {
  clearTimeout(buzzIdle);
  if (tagLink && tagLink.device.gatt.connected) tagLink.device.gatt.disconnect();
}

// Write the walkthrough code (the buzz), or it + "|m" (a sample match); the button shows progress and the note what to expect
async function tagCommand(btn, note, what, labels) {
  btn.disabled = true;
  btn.innerHTML = `<span class="spinner" aria-hidden="true"></span>${labels.busy}`;
  note.textContent = "";
  let ok = false;
  try {
    if (!tagLink) {                                // opened How it works later: pick the tag once
      const { device } = await connectTag(myTag.id);
      tagLink = { device };
    }
    const { device } = tagLink;
    for (let attempt = 1; !device.gatt.connected; attempt++) {
      try { await device.gatt.connect(); }
      catch (err) { if (attempt >= 3) throw err; await new Promise(r => setTimeout(r, 500)); }
    }
    const service = await device.gatt.getPrimaryService(SETUP_SERVICE);
    let char;
    try { char = await service.getCharacteristic(SETUP_BUZZ); }
    catch (e) { note.textContent = "Your tag needs a firmware update for this."; return false; }
    await char.writeValueWithResponse(new TextEncoder().encode(myTag.code + what));
    ok = true;
    note.textContent = labels.done;
    clearTimeout(buzzIdle);
    buzzIdle = setTimeout(buzzDisconnect, 5000);
  } catch (err) {
    if (err.name !== "NotFoundError") note.textContent = "Couldn't reach your tag. Move closer and try again.";
    buzzDisconnect();
  } finally {
    btn.disabled = false;
    btn.textContent = ok ? labels.again : labels.idle;
  }
  return ok;
}

buzzButton.addEventListener("click", async () => {
  const ok = await tagCommand(buzzButton, document.getElementById("buzz-note"), "", {
    idle: "Tap to feel the buzz", busy: "Buzzing…", again: "Tap to feel it again",
    done: "Didn't feel it? Check Settings → Vibration on the tag." });
  if (!ok) return;
  // Restart the mock's shake so it moves with the real buzz
  const step = buzzButton.closest(".howto-step");
  for (const el of [step.querySelector(".tagmock"), step.querySelector(".buzz-label")]) {
    el.style.animation = "none"; void el.offsetWidth; el.style.animation = "";
  }
});

matchButton.addEventListener("click", () => tagCommand(matchButton, document.getElementById("match-note"), "|m", {
  idle: "Show a sample match on my tag", busy: "Sending…", again: "Show another look",
  done: `Watch your tag: it shows “${DATING ? "Sam" : "Alex Tan"}” and buzzes. Each try shows a different look.` }));

// ---------- "Update my tag": new firmware over Bluetooth (include/Ota.c in the tag firmware) ----------
// firmware/manifest.json (next to this page, written by release_firmware.sh) says which build is current. The tag
// downloads it into its spare slot and only switches once it has all of it and NexSwap's signature checks out.
const OTA_CHUNK = 240;       // + 4-byte offset: fits one packet (phones use 247+ byte packets), so no reply is needed
const OTA_SYNC = 32;         // read the tag's status every this many pieces: catches errors, keeps the queue short
const updateButton = document.getElementById("update-tag");

updateButton.addEventListener("click", async () => {
  if (!myTag) return;
  const enc = t => new TextEncoder().encode(t);
  updateButton.disabled = true;
  let conn = null, wakeLock = null, started = false;
  try {
    setStatus("Checking for a new version…");
    const manifest = await (await fetch("firmware/manifest.json", { cache: "no-store" })).json();
    setStatus("Choose your tag in the Bluetooth list…");
    conn = await connectTag(myTag.id);
    let versionChar;
    try { versionChar = await conn.service.getCharacteristic(OTA_VERSION); }
    catch (e) { setStatus("This tag needs one update over USB before it can update over Bluetooth.", "err"); return; }
    const [build, ...name] = new TextDecoder().decode(await versionChar.readValue()).split(" ");
    if (Number(build) >= manifest.build) { setStatus(`Your tag is up to date (${name.join(" ")}).`, "ok"); return; }
    if (!confirm(`Update your tag to version ${manifest.version}? Keep your phone next to it until it's done (about 2 minutes).`)) {
      setStatus("");
      return;
    }
    setStatus("Downloading the update…");
    const bin = new Uint8Array(await (await fetch("firmware/" + manifest.file, { cache: "no-store" })).arrayBuffer());
    if (bin.length !== manifest.size) throw new Error("the download was incomplete");
    const control = await conn.service.getCharacteristic(OTA_CONTROL);
    const data = await conn.service.getCharacteristic(OTA_DATA);
    const tagStatus = async () => new TextDecoder().decode(await control.readValue());
    await control.writeValueWithResponse(enc(`begin|${bin.length}|${manifest.build}|${manifest.signature}`));
    const ready = await tagStatus();
    if (ready !== "ready") throw new Error(ready === "older" ? "your tag already has a newer version" : ready);
    started = true;
    try { wakeLock = await navigator.wakeLock?.request("screen"); } catch (e) {}   // a sleeping phone drops the link
    let shown = -1;
    for (let offset = 0, n = 1; offset < bin.length; offset += OTA_CHUNK, n++) {
      const piece = bin.subarray(offset, offset + OTA_CHUNK), msg = new Uint8Array(4 + piece.length);
      new DataView(msg.buffer).setUint32(0, offset, true);
      msg.set(piece, 4);
      await data.writeValueWithoutResponse(msg);
      if (n % OTA_SYNC === 0) {
        const s = await tagStatus();
        if (s !== "ready") throw new Error(s);
      }
      const pct = Math.floor(100 * (offset + piece.length) / bin.length);
      if (pct !== shown) { setStatus(`Updating your tag… ${pct}%. Keep your phone next to it.`); shown = pct; }
    }
    await control.writeValueWithResponse(enc("end"));
    let done = "checking";
    for (let i = 0; i < 40 && done === "checking"; i++) {   // the tag checks the signature (about a second)
      await new Promise(r => setTimeout(r, 250));
      done = await tagStatus();
    }
    if (done !== "ok") throw new Error(done === "bad-signature" ? "the update arrived damaged or isn't from NexSwap" : done);
    started = false;
    setStatus(`Updated to ${manifest.version}. Your tag is restarting.`, "ok");
  } catch (err) {
    if (started && conn && conn.device.gatt.connected) {
      try { await (await conn.service.getCharacteristic(OTA_CONTROL)).writeValueWithResponse(enc("abort")); } catch (e) {}
    }
    setStatus(err.name === "NotFoundError" ? "No tag chosen. Make sure your tag is on and nearby."
              : `Couldn't update your tag (${err.message}). It keeps its current version; try again.`, "err");
  } finally {
    if (wakeLock) wakeLock.release().catch(() => {});
    if (conn) conn.device.gatt.disconnect();
    updateButton.disabled = false;
  }
});

// ---------- account ----------
const now = () => new Date().toISOString();
const userName = u => u.user_metadata?.full_name || u.user_metadata?.name || "";
const userPhoto = u => u.user_metadata?.avatar_url || u.user_metadata?.picture || "";
const TAG_TAKEN = "This tag is still linked to someone from an earlier event. Ask the organiser to reset the tags.";
// The database's other reasons to refuse a claim (check_claim_event in schema.sql): the tag still has an old event
const TAG_ENDED = "This tag is still set up for an event that has ended. Ask an organiser to set it up for this one.";
const TAG_WRONG_EVENT = "This tag isn't set up for this event. Ask an organiser.";
// Sent without signing in: the tag works, but nothing links it to an account (the claim is made when sending), so
// matches can't be saved. Said plainly, as "Done!" alone let people think they were signed in (2026-10-18)
const SENT_SIGNED_OUT = `Sent to your tag. To ${DATING ? "see your mutual Baes" : "get your matches"} after the event, sign in with Google and send it again.`;
const shareContact = document.getElementById("share-contact");   // email and LinkedIn on the card (on by default)

// Dating: offer = what they're looking for + their own Human Design type, seek = the same + the types it pairs with
// (HD_PAIRS); who = I am (bits 0-1) + who they'd like to meet (bits 2-4), for the tag only (never saved to the
// account); handle = for mutual Baes, for the account only. Company, title and LinkedIn stay empty.
function formProfile() {
  const v = id => clean(document.getElementById(id).value);
  if (DATING) {
    const intent = mask("intent"), hd = HD_NIGHT ? Number(document.getElementById("hd").value) : -1;
    const iam = document.querySelector("#iam input:checked"), i = iam ? Number(iam.value) : 3;
    return { first: v("first"), company: "", title: "", linkedin: "", interests: (mask("interests") | mask("picks")) >>> 0,
             offer: intent | (hd >= 0 ? 1 << (DATING_INTENTS + hd) : 0),
             seek: intent | (hd >= 0 ? HD_PAIRS[hd] << DATING_INTENTS : 0),
             who: (i === 3 ? 0 : i + 1) | mask("open") << 2, handle: v("handle") };
  }
  return { first: v("first"), company: v("company"), title: v("title"), linkedin: v("linkedin"),
           interests: mask("interests"), offer: mask("offer"), seek: mask("seek") };
}
function hdType(offer) {   // their Human Design type (HD_TYPES index), -1 = not given
  for (let i = DATING_INTENTS; i < 8; i++) if (offer & (1 << i)) return i - DATING_INTENTS;
  return -1;
}

// How it works: someone who complements me, for the sample sign and sample match. Business: one person with one
// link, the one my tag names first (signReason: something I'm looking for they offer, else something I offer they
// want), with a role to fit (OFFER_ROLES / SEEK_ROLES, by goal bit). Nothing picked yet: they sell.
// Dating: looking for the same, of the first type mine pairs with (HD_PAIRS). Both: my interests
const OFFER_ROLES = ["Head of Talent · Demo Co", "Partner · Demo Ventures", "VP Engineering · Demo Co",
  "Ex-founder · Demo Labs", "Head of Sales · Demo Co", "Partnerships Lead · Demo Co",
  "Freelance designer · Self-employed", "Advisor · Demo Partners"];
const SEEK_ROLES = ["Software Engineer · Open to work", "Founder · Demo Labs", "Associate PM · Demo Co",
  "Engineer · Stealth startup", "Head of Procurement · Demo Co", "BD Lead · Demo Co",
  "Marketing Lead · Demo Co", "First-time founder · Demo Labs"];
function samplePartner(me) {
  if (!DATING) {
    for (let i = 0; i < 8; i++) {
      if (me.seek & (1 << i)) return { offer: 1 << i, seek: 0, interests: me.interests, role: OFFER_ROLES[i] };
      if (me.offer & (1 << i)) return { offer: 0, seek: 1 << i, interests: me.interests, role: SEEK_ROLES[i] };
    }
    return { offer: 1 << 4, seek: 0, interests: me.interests, role: OFFER_ROLES[4] };
  }
  const intent = me.offer & ((1 << DATING_INTENTS) - 1), mine = hdType(me.offer);
  const type = mine >= 0 ? Math.log2(HD_PAIRS[mine] & -HD_PAIRS[mine]) : -1;   // lowest bit
  return { interests: me.interests, offer: intent | (type >= 0 ? 1 << (DATING_INTENTS + type) : 0),
           seek: intent | (type >= 0 ? HD_PAIRS[type] << DATING_INTENTS : 0) };
}

// The labels of shared interest bits: at a dating event the quick picks (DATING_PICK_FIRST on) before the hobbies
function sharedLabels(shared) {
  const labels = DATING ? DATING_INTERESTS : INTERESTS, first = DATING ? DATING_PICK_FIRST : 0, out = [];
  for (let k = 0; k < 32; k++) {
    const i = (first + k) % 32;
    if (labels[i] && shared & (1 << i)) out.push(labels[i]);
  }
  return out;
}

// The line under the name on me's tag for a match with them, worded as the tag words it: the business reason
// (include/Proximity.c matchReason), "Hiring | AI, Fintech"; at a dating event the hint (datingSign)
function signReason(me, them) {
  if (DATING) return datingSign(me, them).hint;
  let out = "";
  for (let i = 0; i < 8 && !out; i++) {
    if (me.seek & them.offer & (1 << i)) out = OFFER[i];
    else if (me.offer & them.seek & (1 << i)) out = SEEK[i];
  }
  return [out, sharedLabels(me.interests & them.interests).slice(0, 2).join(", ")].filter(Boolean).join(" | ");
}

// The line at the bottom of a dating sign ("" at a business event): card 3 shows badge A's line on my tag and badge
// B's on theirs
function signStarter(me, them, lineA) {
  return DATING ? datingSign(me, them, lineA).line : "";
}

// A dating sign's hint and iceBaeker line, as the tag words them (include/Proximity.c matchOpener): something both
// chose ("Both night owls" / "Pick our 2am supper spot"), else a quick pick pair they split (each defends their own
// side), else their goals and a general pair. The tag picks what the fewest people nearby share, and which badge takes
// line A, from both tags' IDs; the page knows neither, so it takes the first shared pick, then the first shared hobby.
// lineA: which half of the pair this badge shows (a split ignores it: line A is the first side's)
function datingSign(me, them, lineA = true) {
  const half = (games, i, a) => games[2 * i + !a];
  const shared = me.interests & them.interests;
  const pick = [...Array(8).keys()].find(b => shared >>> DATING_PICK_FIRST + b & 1);
  if (pick !== undefined) return { hint: DATING_PICK_HINTS[pick], line: half(DATING_PICK_GAMES, pick, lineA) };
  const hobby = [...Array(DATING_PICK_FIRST).keys()].find(b => shared >>> b & 1);
  if (hobby !== undefined)
    return { hint: `Both into ${DATING_INTERESTS[hobby]}`, line: half(DATING_HOBBY_GAMES, hobby, lineA) };
  const mine = me.interests >>> DATING_PICK_FIRST & 0xFF, theirs = them.interests >>> DATING_PICK_FIRST & 0xFF;
  const firstSide = k => mine >> 2 * k & 1 && theirs >> 2 * k + 1 & 1;
  const split = [0, 1, 2, 3].find(k => firstSide(k) || (mine >> 2 * k + 1 & 1 && theirs >> 2 * k & 1));
  if (split !== undefined) return { hint: DATING_SPLIT_HINTS[split], line: half(DATING_SPLIT_GAMES, split, firstSide(split)) };
  const same = [...Array(DATING_INTENTS).keys()].find(i => me.seek & them.offer & (1 << i));
  const a = hdType(me.offer), b = hdType(them.offer), types = 0xFF << DATING_INTENTS;
  let hint = "";
  if (same !== undefined) hint = `Both: ${DATING_GOALS[same]}`;
  else if (a >= 0 && b >= 0 && ((me.seek & them.offer) | (me.offer & them.seek)) & types)
    hint = `${DATING_GOALS[DATING_INTENTS + Math.min(a, b)]} + ${DATING_GOALS[DATING_INTENTS + Math.max(a, b)]}`;
  return { hint, line: half(DATING_GAMES, 0, lineA) };
}

function fillForm(p) {
  ["first", "company", "title", "linkedin"].forEach(id => document.getElementById(id).value = p[id] || "");
  [["interests", p.interests], ["offer", p.offer], ["seek", p.seek]].forEach(([id, m]) =>
    document.querySelectorAll(`#${id} input`).forEach(cb => cb.checked = !!((m || 0) & (1 << Number(cb.value)))));
  saveForm();
  limitChips();
}

// Only the profile: the database builds the card mutual matches see from it (build_card in schema.sql), with the
// email and LinkedIn link only when sharing is on (the tag still hands the link to people who tap it). Dating: the
// dating profile, through save_dating_profile (the dating tables are hidden from the page), without who.
async function saveToAccount() {
  if (!user) return true;
  const p = formProfile();
  let { error } = DATING
    ? await supabase.rpc("save_dating_profile", { p_first: p.first, p_handle: p.handle, p_interests: p.interests,
                                                  p_offer: p.offer, p_seek: p.seek })
    : await supabase.from("profiles").upsert({ id: user.id, ...p, share_email: shareContact.checked,
                                               last_active_at: now(), updated_at: now() });
  // "Email me about my matches" (set_dating_emails in migrations/20261029_dating_emails.sql); the profile is saved
  // either way
  if (DATING && !error) {
    const { error: emailsError } = await supabase.rpc("set_dating_emails",
                                                      { p_on: document.getElementById("emails").checked });
    if (emailsError) console.error(emailsError);
  }
  // the photo after the profile it belongs to ('' removes it: save_dating_photo in schema.sql)
  if (DATING && !error && photoChanged) {
    ({ error } = await supabase.rpc("save_dating_photo", { p_photo: datingPhoto }));
    if (!error) { photoChanged = false; saveForm(); }
  }
  if (error) console.error(error);
  return !error;
}

// Link a tag to this account, so the console saves its match list here when the tag is returned. Refused while
// someone else holds it: the first claim stands until the tags are freed after the event. Called after sending a
// profile (never on a plain visit: that could re-claim a tag already handed back). kind: which tables the console saves
// its log to (dating.matches with the votes, or matches). eventId: the event it's for (the database refuses one that has
// ended, or is of the other type).
async function claimTag(tagId, eventId) {
  const { error } = await supabase.from("tag_owners").upsert({ tag_id: tagId, uid: user.id, kind: DATING ? "d" : "b",
                                                               event_id: eventId || null, updated_at: now() });
  if (error) console.error(error);
  // "" when claimed, else what to tell them
  const m = error ? error.message : "";
  return !error ? "" : /no event/.test(m) ? TAG_OLD : /ended/.test(m) ? TAG_ENDED : /event/.test(m) ? TAG_WRONG_EVENT : TAG_TAKEN;
}

async function signIn() {
  // Off to Google and back to this same address (the tag link included); the form is already saved on this phone
  const back = location.origin + location.pathname + location.search;
  const { error } = await supabase.auth.signInWithOAuth({ provider: "google", options: { redirectTo: back } });
  if (error) setStatus(`Sign-in failed: ${error.message}`, "err");
}
document.getElementById("google").addEventListener("click", signIn);
document.getElementById("google-matches").addEventListener("click", signIn);
document.getElementById("signout").addEventListener("click", () => { supabase.auth.signOut(); activeTab = "profile"; render(); });
document.getElementById("delete").addEventListener("click", async () => {
  if (!user || !confirm("Delete your saved NexSwap profile and matches? Your tag keeps its current profile until you write a new one.")) return;
  try {
    // One call: removes the account, which removes its profile, card, tag claims and matches, including the
    // entries about it in other people's match lists (delete_my_account in schema.sql)
    const { error } = await supabase.rpc("delete_my_account");
    if (error) throw error;
    try { localStorage.removeItem("nexswap-tag"); } catch (e) {}
    myTag = null;
    try { localStorage.removeItem(FORM_KEY); } catch (e) {}
    await supabase.auth.signOut({ scope: "local" });   // the account is gone: just forget the session on this phone
    setStatus("Your saved profile was deleted.", "ok");
  } catch (e) {
    setStatus(`Couldn't delete: ${e.message}`, "err");
  }
});

// Back from the tag's Wi-Fi: its "saved" page links to ?tag=<id>#sent. Finish like a Bluetooth send.
let wifiSent = null;
try {
  const pending = JSON.parse(localStorage.getItem(WIFI_PENDING) || "null");
  if (location.hash === "#sent" && pending && pending.id === TAG_ID) {
    wifiSent = pending;
    localStorage.removeItem(WIFI_PENDING);
    rememberTag(pending.id);
    history.replaceState(null, "", location.pathname + location.search);
    let firstTime = false;
    try { firstTime = !localStorage.getItem(ONBOARDED); } catch (e) {}
    mode = firstTime ? "howto" : "summary";
    howtoStep = 1;
    setStatus("Done! Your tag should say “Profile saved”.", "ok");
  }
} catch (e) {}

// Fires on load (INITIAL_SESSION), after sign-in and sign-out, and on hourly token refreshes: only a change of person
// matters. Handled outside the callback, since Supabase calls made inside it can wait on each other forever.
let shownUserId;
supabase.auth.onAuthStateChange((_event, session) => {
  const u = session?.user ?? null;
  if ((u ? u.id : null) === shownUserId) return;
  shownUserId = u ? u.id : null;
  setTimeout(() => showUser(u));
});

async function showUser(u) {
  user = u;
  document.getElementById("signed-in").hidden = !u;
  document.getElementById("delete").hidden = !u;
  document.getElementById("share-contact-row").hidden = !u || DATING;
  onTeam = false;
  editingPartner = null;
  render();
  checkTeam();
  if (!u) {
    if (wifiSent) { setStatus(SENT_SIGNED_OUT); wifiSent = null; }   // (back from the tag's Wi-Fi, signed out)
    return;
  }
  document.getElementById("who").textContent = u.email || userName(u) || "your Google account";
  showAvatar();
  // Dating: your own photo from the account (my_dating_photo in schema.sql), unless it was changed here and not saved yet
  if (DATING && !photoChanged) {
    const { data, error } = await supabase.rpc("my_dating_photo");
    if (error) console.error(error);
    else if (typeof data === "string" && (data === "" || /^data:image\/jpeg;base64,/.test(data))) {
      datingPhoto = data;
      showPhoto();
      saveForm();
    }
  }
  // Dating: an account that turned the match emails off (my_dating_emails) shows "Email me about my matches" unticked
  if (DATING) {
    const { data, error } = await supabase.rpc("my_dating_emails");
    if (error) console.error(error);
    else if (data === false) { document.getElementById("emails").checked = false; saveForm(); }
  }
  try {
    // (dating: no business profile to load; the dating form is on this phone and goes to the account on Send)
    const { data, error } = DATING ? {} : await supabase.from("profiles").select("*").eq("id", u.id).maybeSingle();
    if (error) throw error;
    if (data) {
      fillForm(data);
      shareContact.checked = data.share_email;
      // the 24-month rule counts from the last visit
      supabase.from("profiles").update({ last_active_at: now() }).eq("id", u.id).then(({ error }) => error && console.error(error));
      updateInterestCount();
      if (!wifiSent && mode !== "howto") {      // (?howto=1, or the walkthrough already open, stays open)
        mode = "summary";
        if (!TAG_ID) activeTab = "matches";    // returning visit without a tag: matches are the likely reason
        setStatus("");
      }
      render();
    } else {
      if (!document.getElementById("first").value && userName(u)) {
        document.getElementById("first").value = userName(u).split(" ")[0].slice(0, 12);
      }
      const company = document.getElementById("company");
      const guess = DATING ? "" : companyFromEmail(u.email);
      if (!company.value && guess) company.value = guess;
      saveForm();
      if (!hasProfile()) { mode = "wizard"; step = 1; }
      else if (DATING && !TAG_ID && !wifiSent && mode !== "howto") activeTab = "matches";   // after the event
      render();
      setStatus(guess ? `We guessed your company from your email (${guess}). Edit it if it's wrong.` : "");
    }
  } catch (e) {
    setStatus(`Couldn't load your saved profile: ${e.message}`, "err");
  }
  if (wifiSent) {                            // the tag has the profile: link it to the account, as after Bluetooth
    const problem = await claimTag(wifiSent.id, wifiSent.ev);
    const saved = await saveToAccount();
    if (problem) setStatus(problem, "err");
    else if (!saved) setStatus("Sent to your tag, but saving to your account failed. Try again later.", "err");
    wifiSent = null;
  }
  try {
    await renderMatches();
  } catch (e) {
    console.error(e);
  }
}

// Advert manufacturer data after the company ID: 'N' 'X' version, then the tag ID little-endian (see Proximity.c).
// Both advert types (MATCH and HELLO) start with this. Versions 2 and 1 = tags on older firmware: still found.
const TAG_ADVERT_VERSIONS = [3, 2, 1];
function tagAdvertFilters(tagHex) {
  const id = parseInt(tagHex, 16) >>> 0;
  return TAG_ADVERT_VERSIONS.map(v => ({ manufacturerData: [{ companyIdentifier: 0xFFFF,
    dataPrefix: new Uint8Array([0x4E, 0x58, v, id & 0xFF, (id >>> 8) & 0xFF, (id >>> 16) & 0xFF, (id >>> 24) & 0xFF]) }] }));
}

async function connectTag(tagId) {
  const device = await navigator.bluetooth.requestDevice({
    filters: tagAdvertFilters(tagId),
    optionalServices: [SETUP_SERVICE],
  });
  setStatus("Connecting to your tag…");
  let server;
  for (let attempt = 1; ; attempt++) {           // the first connect can fail while the tag is busy scanning
    try { server = await device.gatt.connect(); break; }
    catch (err) { if (attempt >= 3) throw err; await new Promise(r => setTimeout(r, 500)); }
  }
  return { device, service: await server.getPrimaryService(SETUP_SERVICE) };
}

// Send the profile. The match log never comes back to the phone: the console reads it when the tag is returned.
async function sendToTag() {
  const { device, service } = await connectTag(TAG_ID);
  try {
    const profileChar = await service.getCharacteristic(SETUP_PROFILE);
    const statusChar = await service.getCharacteristic(SETUP_STATUS);
    setStatus("Sending…");
    await profileChar.writeValueWithResponse(new TextEncoder().encode(`k=${SETUP_CODE}|${payload()}`));
    const result = new TextDecoder().decode(await statusChar.readValue());
    let code = "";
    if (result === "ok") {                   // for "Tap to feel the buzz": the walkthrough code, on this connection only
      try { code = new TextDecoder().decode(await (await service.getCharacteristic(SETUP_BUZZ)).readValue()); } catch (e) {}
      if (!/^[0-9A-F]{16}$/.test(code)) code = "";
      tagLink = { device };
    }
    return { result, code };
  } finally {
    device.gatt.disconnect();
  }
}

// ---------- matches ----------
// The console saves each returned tag's match log to the account that claimed it (console_save_tag in schema.sql);
// this page only reads the result.

// Same idea as the tag's match reason: what they bring that I want (or want that I bring), then shared interests.
// Dating: looking for the same thing, or their type and mine when they pair, then shared hobbies
function matchReason(card) {
  const me = formProfile();
  if (DATING) {
    const { goal, hobbies } = datingWhy(card);
    return [goal, hobbies.join(", ")].filter(Boolean).join(" · ");
  }
  const parts = [];
  for (let i = 0; i < 8; i++) {
    const bit = 1 << i;
    if (me.seek & card.offer & bit) parts.push(OFFER[i]);
    else if (me.offer & card.seek & bit) parts.push(SEEK[i]);
  }
  const shared = INTERESTS.filter((_, i) => (me.interests & card.interests) & (1 << i)).slice(0, 3);
  return [parts.slice(0, 2).join(", "), shared.join(", ")].filter(Boolean).join(" · ");
}

function el(tag, className, text) {
  const e = document.createElement(tag);
  if (className) e.className = className;
  if (text) e.textContent = text;
  return e;
}

// "Thu 23 Oct, 9:00 pm" in the phone's own time zone
function whenText(t) {
  return new Date(t).toLocaleString(undefined, { weekday: "short", day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });
}

// ---------- dating matches: swipe, your choices, the reveal ----------
// While the window is open (my_dating_choices): the ones still to decide (no tap on the tag, or brought back with
// rewind) are a stack to swipe, right Bae and left Nay, or with the buttons; everyone decided is in "Your choices", where
// a tap switches Bae and Nay until the deadline. Nobody sees anyone's choice. After it (my_dating_matches): each mutual
// Bae gets a full-screen reveal once on this phone, then a photo card with their handle to copy.
let dating = { open: [], done: [] };   // the cards from the last load
let datingRewound = new Set();          // match IDs brought back to the stack this visit
let datingSwiped = [];                  // match IDs swiped this visit, newest last (for rewind)
let revealTimer, countdownTimer;
const REVEALED = "nexswap-revealed";    // the mutual Baes already revealed on this phone
// Matches opened, for the match emails (dating_seen in migrations/20261029_dating_emails.sql: e4 and e5 skip anyone who
// has opened their reveal): once while the window is open and once after a reveal shows, per page load. ?from= names
// the email whose link brought them.
let seenOpen = false, seenDone = false;
function markMatchesSeen() {
  if (!DATING || !user || DEMO || activeTab !== "matches") return;
  const done = dating.done.length > 0;
  if (done ? seenDone : seenOpen) return;
  if (done) seenDone = true; else seenOpen = true;
  supabase.rpc("dating_seen", { p_via: params.get("from") || "" }).then(({ error }) => error && console.error(error));
}

// Their goal line and shared hobbies, as matchReason words them (the first three, or all for the profile)
function datingWhy(card, all = false) {
  if (card.goal !== undefined) return { goal: card.goal, hobbies: card.hobbies || [] };   // (demo cards)
  const me = formProfile();
  let goal = "";
  const same = [0, 1, 2].find(i => me.seek & card.offer & (1 << i));
  const mine = hdType(me.offer), theirs = hdType(card.offer), types = 0xFF << DATING_INTENTS;
  if (same !== undefined) goal = `Both: ${DATING_GOALS[same]}`;
  else if (mine >= 0 && theirs >= 0 && ((me.seek & card.offer) | (me.offer & card.seek)) & types)
    goal = `${HD_TYPES[theirs]} meets ${HD_TYPES[mine]}`;
  const hobbies = sharedLabels(me.interests & card.interests);
  return { goal, hobbies: all ? hobbies : hobbies.slice(0, 3) };
}

// "2 days 4 h left", "3 h 20 min left", "45 min left", "closing soon"
function leftText(until) {
  const m = Math.max(0, Math.round((Date.parse(until) - Date.now()) / 6e4));
  if (m >= 1440) { const d = Math.floor(m / 1440), h = Math.floor(m % 1440 / 60);
                   return `${d} day${d === 1 ? "" : "s"}${h ? ` ${h} h` : ""} left`; }
  if (m >= 60) return `${Math.floor(m / 60)} h${m % 60 ? ` ${m % 60} min` : ""} left`;
  return m >= 5 ? `${m} min left` : "closing soon";
}

function icon(id) {
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("aria-hidden", "true");
  const use = document.createElementNS("http://www.w3.org/2000/svg", "use");
  use.setAttribute("href", `#${id}`);
  svg.append(use);
  return svg;
}

// Their photo (a small JPEG from the account, or a demo person's stock photo in demo/), or a gradient in one of the
// tag's glow colours (the same one for the same person) with their initial
function photoOrInitial(box, card, initialClass) {
  if (/^(data:image\/jpeg;base64,|demo\/[a-z]+\.jpg$)/.test(card.photoURL || "")) {
    const img = document.createElement("img");
    img.src = card.photoURL; img.alt = "";
    box.append(img);
  } else {
    let h = 0;
    for (const ch of String(card.matchId || card.tagId || card.first)) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
    box.style.background = `linear-gradient(140deg, ${GLOW[h % GLOW.length]}, #2a1438)`;
    box.append(el("span", initialClass, (card.first || "?").slice(0, 1).toUpperCase()));
  }
}

// A mutual Bae's whole dating profile (my_dating_matches sends their interests and goals): what they're looking for,
// their Human Design type if they gave one, their quick picks and hobbies, each marked when you share it
function datingProfileOf(card) {
  if (card.theirs) return card.theirs;   // (demo cards)
  const me = formProfile(), has = (mask, i) => ((mask >>> i) & 1) === 1;
  const out = { looking: [], type: "", picks: [], hobbies: [] };
  for (let i = 0; i < DATING_INTENTS; i++)
    if (has(card.offer, i)) out.looking.push({ label: DATING_GOALS[i], both: has(me.offer, i) });
  const t = hdType(card.offer);
  if (t >= 0) out.type = HD_TYPES[t];
  for (let i = 0; i < 32; i++)
    if (DATING_INTERESTS[i] && has(card.interests, i))
      (i >= DATING_PICK_FIRST ? out.picks : out.hobbies).push({ label: DATING_INTERESTS[i], both: has(me.interests, i) });
  return out;
}

// Up to 3 first-date spots from what you both picked: one per shared pick or hobby, a date partner (datePartners) before
// a DATE_SPOTS spot, no place twice; partners first, then venues, then free public places, then quick picks before
// hobbies. Where a pick has several, which one comes from the shared picks alone, so both of you see the same. Nothing
// shared (or nothing with a spot): a classic one.
function dateIdeas(card) {
  const full = datingProfileOf(card);
  const bits = [...full.picks, ...full.hobbies].filter(x => x.both).map(x => DATING_INTERESTS.indexOf(x.label)).filter(b => b >= 0);
  const seed = bits.reduce((m, b) => (m | (1 << b)) >>> 0, 0);
  let ideas = [];
  const seen = new Set();
  for (const b of bits) {
    const partners = datePartners.filter(p => p.interests.includes(b) && !seen.has(p.name));
    if (partners.length) {
      const p = partners[(seed + b) % partners.length];
      seen.add(p.name);
      ideas.push({ ...p, why: DATE_REASONS[b], partner: true });
      continue;
    }
    const spots = DATE_SPOTS[b];
    if (!spots) continue;
    const [, name, kind, area, free] = spots[(seed + b) % spots.length];
    if (seen.has(name)) continue;
    seen.add(name);
    ideas.push({ name, kind, area, free: !!free, why: DATE_REASONS[b] });
  }
  ideas = [...ideas.filter(x => x.partner), ...ideas.filter(x => !x.partner && !x.free), ...ideas.filter(x => x.free)];
  if (!ideas.length) {
    const [, name, kind, area] = DATE_FALLBACK[seed % DATE_FALLBACK.length];
    ideas.push({ name, kind, area, why: "A classic first date" });
  }
  return ideas.slice(0, 3);
}

// A box of first-date spots, each with Map (the partner's own Maps link, else a Google Maps search; phones open the Maps
// app) and, for a partner that takes bookings, Book; under a partner, its perk and how to claim it. Tapping that opens
// the redeem card (openVoucher); a partner with a promo code, or whose staff see the match screen, also has Use, and
// its card the redeem button (the code shows there only once redeemed, never here)
function dateIdeasBox(ideas, label, card) {
  const box = el("div", "d-idea");
  box.append(el("p", "d-label", label));
  for (const idea of ideas) {
    const spot = el("div", "d-idea-spot"), row = el("div", "d-idea-row"), text = el("div", "d-idea-text");   // a spot: the place, then its perk
    text.append(el("strong", "", idea.name), el("span", "d-idea-where", `${idea.kind} · ${idea.area || "nearest outlet"}`),
                el("span", "d-idea-why", idea.why));
    const acts = el("div", "d-idea-acts"), map = el("a", "d-idea-map", "Map");
    map.href = idea.map || "https://www.google.com/maps/search/?api=1&query=" +
               encodeURIComponent([idea.name, idea.area, "Singapore"].filter(Boolean).join(", "));
    map.target = "_blank";
    map.rel = "noopener";
    map.setAttribute("aria-label", `${idea.name} on Google Maps`);
    map.append(icon("fa-back"));
    acts.append(map);
    if (idea.book) {
      const book = el("a", "d-idea-map d-idea-book", "Book");
      book.href = bookHref(idea);
      book.target = "_blank";
      book.rel = "noopener";
      book.setAttribute("aria-label", parseWa(idea.book) ? `Book ${idea.name} on WhatsApp` : `Book ${idea.name}`);
      book.append(icon("fa-back"));
      acts.append(book);
    }
    row.append(text, acts);
    spot.append(row);
    box.append(spot);
    if (idea.perk) {
      const perk = el("div", "d-perk");
      perk.append(el("span", "", idea.claim ? `${idea.perk} · ${idea.claim}` : idea.perk));
      perk.addEventListener("click", () => openVoucher(idea, card));   // (Use's tap too)
      if (idea.promo || idea.claim === MATCH_CLAIM) {
        const use = el("button", "d-perk-use", "Use");
        use.type = "button";
        use.setAttribute("aria-label", `Use the perk at ${idea.name}: ${idea.perk}`);
        perk.append(use);
      } else {   // (the strip is the button)
        perk.setAttribute("role", "button");
        perk.tabIndex = 0;
        perk.setAttribute("aria-label", `See the perk at ${idea.name}: ${idea.perk}`);
        perk.addEventListener("keydown", e => {
          if (e.key !== "Enter" && e.key !== " ") return;
          e.preventDefault();
          openVoucher(idea, card);
        });
        perk.append(el("span", "d-perk-more", "›"));
      }
      spot.append(perk);
    }
  }
  return box;
}

// A pair perk, full screen: the spot, both faces, the perk and how to claim it. With a promo code (Partners tab), also
// Hold to redeem: held for 1.2 s, it gives way to Redeemed with where and when, and the code with Copy. With "Show
// your match screen", the same at the counter, but the code is a new one made on the page (matchCode), on a moving
// shimmer so staff can tell it from a screenshot. A redeem is only remembered on this page: a reload means a new hold
// and code
const redeemedPerks = new Map();   // pair|venue -> { at: when it was redeemed, code }
// A one-time code for staff, e.g. NX-7K3Q (no 0, O, 1 or I)
function matchCode() {
  const abc = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";
  return "NX-" + Array.from(crypto.getRandomValues(new Uint8Array(4)), n => abc[n % abc.length]).join("");
}
// A partner's photo for its redeem card: the one it came with (the Partners tab's preview, the demo), else from the
// database once per partner (partner_photo in schema.sql: only when a card opens, not with the list). "" when none.
const venuePhotos = new Map();
function venuePhoto(idea) {
  if (typeof idea.photo === "string") return Promise.resolve(idea.photo);
  if (!idea.id || DEMO) return Promise.resolve("");
  if (!venuePhotos.has(idea.id))
    venuePhotos.set(idea.id, supabase.rpc("partner_photo", { p_id: idea.id })
      .then(({ data, error }) => { if (error) console.warn("Venue photo not loaded:", error.message); return data || ""; }));
  return venuePhotos.get(idea.id);
}
function closeVoucher() {
  const v = document.querySelector(".d-voucher");
  if (!v) return false;
  v.remove();
  return true;
}
function openVoucher(idea, card) {
  closeVoucher();
  const key = `${card.matchId || card.tagId || card.first}|${idea.name}`;
  const v = el("div", "d-voucher");
  v.setAttribute("role", "dialog");
  v.setAttribute("aria-modal", "true");
  v.setAttribute("aria-label", `${idea.perk} at ${idea.name}`);
  v.tabIndex = -1;
  const x = el("button", "d-voucher-x", "✕");
  x.type = "button";
  x.setAttribute("aria-label", "Close");
  x.addEventListener("click", closeVoucher);
  v.addEventListener("click", e => { if (e.target === v) closeVoucher(); });

  const hero = el("div", "d-vhero"), pair = el("div", "d-vpair"), them = el("div", "d-vface"), me = el("div", "d-vface");
  photoOrInitial(them, card, "");
  photoOrInitial(me, { first: document.getElementById("first").value.trim() || "You", photoURL: datingPhoto, tagId: "me" }, "");
  pair.append(them, me);
  hero.append(el("span", "d-vvenue", idea.name), pair);
  venuePhoto(idea).then(src => {   // (the gradient until it loads, and when there's none)
    if (!VENUE_PHOTO.test(src)) return;
    const img = el("img", "d-vphoto");
    img.alt = "";
    img.addEventListener("load", () => hero.prepend(img, el("span", "d-vshade")));
    img.src = src;
  });

  const body = el("div", "d-vbody");
  body.append(el("p", "d-vwho", `${card.first} & you · first date`), el("div", "d-vbanner", idea.perk));
  if (idea.claim) body.append(el("p", "d-vfine d-vclaim", idea.claim));
  const vcard = el("div", "d-vcard");
  vcard.append(hero, body);
  v.append(x, vcard);
  document.body.append(v);
  v.focus();
  const forStaff = !idea.promo && idea.claim === MATCH_CLAIM;
  if (!idea.promo && !forStaff) return;   // (nothing to redeem: the perk is claimed as the strip says)

  const hold = el("button", "d-vhold");
  const note = el("p", "d-vfine", forStaff ? "Hold at the counter, in front of staff." : "Hold to get your code.");
  hold.type = "button";
  hold.append(el("i"), el("span", "", "Hold to redeem"));
  const done = el("div", "d-vdone"), when = el("p", "d-vfine");
  done.append(el("p", "d-vdone-t", "✓ Redeemed"));
  const row = el("div", "d-vcode-row"), copy = el("button", "d-vcopy", "Copy");
  copy.type = "button";
  copy.setAttribute("aria-label", `Copy the promo code ${idea.promo}`);
  copy.addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(idea.promo);
      copy.textContent = "Copied";
    } catch (err) {
      copy.textContent = "Couldn't copy";
    }
    setTimeout(() => { copy.textContent = "Copy"; }, 1500);
  });
  row.append(el("div", "d-vcode", idea.promo), copy);   // the venue's code, to type when booking
  const staffCode = el("div", "d-vcode live");   // (for staff to see, so no Copy)
  done.append(forStaff ? staffCode : row, when);
  const showDone = ({ at, code }) => {
    staffCode.textContent = code;
    when.textContent = `${idea.name} · ${at.toLocaleDateString("en-SG", { day: "numeric", month: "short" })}, ` +
                       at.toLocaleTimeString("en-SG", { hour: "2-digit", minute: "2-digit", hour12: false });
    hold.hidden = note.hidden = true;
    done.hidden = false;
  };
  done.hidden = true;
  let timer = null;
  const start = e => {
    if (e.type === "keydown" && (e.repeat || (e.key !== " " && e.key !== "Enter"))) return;
    e.preventDefault();
    hold.classList.add("on");
    timer = setTimeout(() => {
      const redeem = { at: new Date(), code: forStaff ? matchCode() : "" };
      redeemedPerks.set(key, redeem);
      try { navigator.vibrate?.(30); } catch (err) {}
      showDone(redeem);
    }, 1200);
  };
  const stop = () => { clearTimeout(timer); hold.classList.remove("on"); };
  hold.addEventListener("pointerdown", start);
  hold.addEventListener("keydown", start);
  for (const type of ["pointerup", "pointerleave", "pointercancel", "keyup", "blur"]) hold.addEventListener(type, stop);
  hold.addEventListener("contextmenu", e => e.preventDefault());   // a long press on a phone shouldn't open a menu
  const past = redeemedPerks.get(key);
  if (past && (past.code || !forStaff)) showDone(past);   // (no code: redeemed before the claim changed, so hold again)

  body.append(hold, note, done);
}
// Escape closes the voucher (only it: capture, before closeProfile's listener)
window.addEventListener("keydown", e => { if (e.key === "Escape" && closeVoucher()) e.stopImmediatePropagation(); }, true);

// Chips with the shared ones filled in
function markedChips(items) {
  const chips = el("div", "d-chips marked");
  items.forEach(x => chips.append(el("span", x.both ? "both" : "", x.label)));
  return chips;
}

function chipsFor(hobbies) {
  const chips = el("div", "d-chips");
  hobbies.forEach(x => chips.append(el("span", "", x)));
  return chips;
}

// Save one choice (decide_dating_match: only my side, only before the deadline); the page shows it at once and puts it
// back if the save fails
async function setDatingVote(card, vote) {
  const before = card.vote;
  card.vote = vote;
  datingRewound.delete(card.matchId);
  drawDating();
  if (DEMO) return;
  const { error } = await supabase.rpc("decide_dating_match", { p_match: card.matchId, p_vote: vote });
  if (!error) return setStatus("");
  console.error(error);
  card.vote = before;
  if (/decisions closed/.test(error.message || "")) {
    setStatus("Too late: the time to change it is over.", "err");
    renderMatches().catch(console.error);
  } else {
    setStatus("Couldn't save that. Check your connection and try again.", "err");
    drawDating();
  }
}

function swipeCard(card, depth) {
  const c = el("article", "d-card" + (depth === 1 ? " behind" : depth === 2 ? " behind2" : ""));
  const photo = el("div", "d-photo");
  photoOrInitial(photo, card, "d-initial");
  const pill = el("span", "d-pill", `⏱ ${leftText(card.decideBy)}`);
  pill.dataset.until = card.decideBy;
  pill.classList.toggle("soon", Date.parse(card.decideBy) - Date.now() < 36e5);
  photo.append(pill, el("span", "d-stamp bae", "BAE"), el("span", "d-stamp nay", "NAY"), el("span", "d-name", card.first));
  const { goal, hobbies } = datingWhy(card);
  const body = el("div", "d-body");
  body.append(el("p", "d-goal", goal), chipsFor(hobbies));
  c.append(photo, body);
  return c;
}

// A swipe: the card flies off (unless the phone asks for less motion), then the choice is saved
function swipeMatch(card, vote, node) {
  datingSwiped.push(card.matchId);
  if (node && !reduceMotion()) {
    node.classList.add("going");
    node.style.transform = `translateX(${vote === "bae" ? 520 : -520}px) rotate(${vote === "bae" ? 24 : -24}deg)`;
    node.style.opacity = "0";
    setTimeout(() => setDatingVote(card, vote), 260);
  } else setDatingVote(card, vote);
}

const buzz = () => { try { navigator.vibrate?.(12); } catch (e) {} };

// Dragging the top card: it counts past 110 px, or on a quick flick (faster than 0.6 px/ms at the end); a light buzz
// (phones that can) the moment it counts; shorter, slower drags spring back
function dragCard(node, card) {
  let x0 = null, dx = 0, last = [], over = false;
  const stamps = { bae: node.querySelector(".d-stamp.bae"), nay: node.querySelector(".d-stamp.nay") };
  node.addEventListener("pointerdown", e => {
    x0 = e.clientX; dx = 0; last = [[e.timeStamp, e.clientX]]; over = false;
    node.classList.remove("back");
    node.setPointerCapture(e.pointerId);
  });
  node.addEventListener("pointermove", e => {
    if (x0 === null) return;
    dx = e.clientX - x0;
    last.push([e.timeStamp, e.clientX]);
    if (last.length > 5) last.shift();
    node.style.transform = `translateX(${dx}px) rotate(${Math.max(-18, Math.min(18, dx / 16))}deg)`;
    stamps.bae.style.opacity = Math.max(0, Math.min(1, dx / 110));
    stamps.nay.style.opacity = Math.max(0, Math.min(1, -dx / 110));
    const now = Math.abs(dx) > 110;
    if (now && !over) { buzz(); (dx > 0 ? stamps.bae : stamps.nay).classList.add("hit"); }
    if (!now) Object.values(stamps).forEach(s => s.classList.remove("hit"));
    over = now;
  });
  const end = e => {
    if (x0 === null) return;
    x0 = null;
    const [t0, xA] = last[0], v = (e.clientX - xA) / Math.max(1, e.timeStamp - t0);
    // Cancelled: the browser took the touch to scroll the page (or the system took it), so neither a tap nor a swipe
    const flick = e.type !== "pointercancel" && Math.abs(v) > 0.6 && Math.abs(dx) > 30;
    if (e.type !== "pointercancel" && Math.abs(dx) < 6 && e.timeStamp - last[0][0] < 500 && last.length < 5) {   // a tap, not a drag
      node.style.transform = "";
      return openProfile(card, false);
    }
    if (Math.abs(dx) > 110 || flick) {
      if (flick && !over) buzz();
      swipeMatch(card, (flick ? v : dx) > 0 ? "bae" : "nay", node);
    } else {
      node.classList.add("back");
      node.style.transform = "";
      stamps.bae.style.opacity = stamps.nay.style.opacity = 0;
    }
  };
  node.addEventListener("pointerup", end);
  node.addEventListener("pointercancel", end);
}

function roundButton(cls, iconId, label, onClick) {
  const b = el("button", `d-round ${cls}`);
  b.type = "button";
  b.setAttribute("aria-label", label);
  b.title = label;
  b.append(icon(iconId));
  b.addEventListener("click", onClick);
  return b;
}

// A mutual Bae's handle to copy, and Open beside it when it says which app (parseHandle): Instagram on their profile,
// Telegram on a chat with them (phones open these links in the app)
function copyHandle(handle) {
  const { app, name } = parseHandle(handle), shown = app ? "@" + name : handle;
  const canOpen = !!app && HANDLE_APPS[app].ok.test(name), copy = canOpen ? "Copy" : "Tap to copy";   // (room for Open)
  const row = el("div", "d-contact");
  const b = el("button", "d-handle");
  b.type = "button";
  const label = el("span", ""), hint = el("small", "", copy);
  if (app) label.append(icon(`app-${app}`));
  label.append(el("span", "", shown));
  b.append(label, hint);
  b.addEventListener("click", async () => {
    try { await navigator.clipboard.writeText(shown); hint.textContent = "Copied"; }
    catch (e) { hint.textContent = "Couldn't copy"; }
    setTimeout(() => { hint.textContent = copy; }, 1600);
  });
  row.append(b);
  if (canOpen) {
    const open = el("a", "d-open", "Open");
    open.href = HANDLE_APPS[app].url + encodeURIComponent(name);
    open.target = "_blank";
    open.rel = "noopener";
    open.setAttribute("aria-label", `Open in ${HANDLE_APPS[app].name}`);
    open.append(icon("fa-back"));
    row.append(open);
  }
  return row;
}

function seenKey(card) { return `${card.tagId}|${card.savedAt}`; }
function seenReveals() {
  try { return new Set(JSON.parse(localStorage.getItem(REVEALED) || "[]")); } catch (e) { return new Set(); }
}

// One full-screen moment per mutual Bae not yet revealed on this phone, one after the other
function showReveals(cards) {
  document.querySelector(".d-reveal")?.remove();
  const seen = seenReveals();
  const todo = cards.filter(c => !seen.has(seenKey(c)));
  let i = 0;
  const one = () => {
    document.querySelector(".d-reveal")?.remove();
    if (i >= todo.length) return;
    const card = todo[i];
    seen.add(seenKey(card));
    try { localStorage.setItem(REVEALED, JSON.stringify([...seen].slice(-300))); } catch (e) {}
    const r = el("div", "d-reveal");
    r.setAttribute("role", "dialog");
    r.setAttribute("aria-label", `It's a match with ${card.first}`);
    const face = el("div", "face");
    photoOrInitial(face, card, "");
    if (todo.length > 1) r.append(el("span", "count", `${i + 1} of ${todo.length}`));
    r.append(el("p", "kicker", "Mutual Bae"), el("h2", "", "It's a match!"), face, el("p", "rname", card.first));
    const { goal } = datingWhy(card);
    if (goal) r.append(el("p", "rwhy", goal));
    for (let h = 0; h < 7; h++) {
      const heart = icon("fa-bae");
      heart.classList.add("heart");
      Object.assign(heart.style, { left: `${12 + h * 12}%`, top: `${48 + (h % 3) * 8}%`, color: GLOW[[6, 2, 0][h % 3]],
                                   animationDelay: `${0.15 * h}s` });
      r.append(heart);
    }
    if (card.handle) r.append(copyHandle(card.handle));
    const next = el("button", "next", i + 1 < todo.length ? "Next match" : "See all");
    next.type = "button";
    next.addEventListener("click", () => { i++; one(); });
    r.append(next);
    swipeAway(r, () => { i++; one(); });
    document.body.append(r);
    // Focus the reveal, not its button: screen readers announce it and Tab reaches the button, but a focus moved here
    // (not by a key) would draw the button's keyboard ring on a phone
    r.tabIndex = -1;
    r.focus();
  };
  one();
}

// A reveal follows a sideways drag: let go past the threshold (or flick) and it slides off to the next one, as
// "Next match" does; otherwise it springs back
function swipeAway(sheet, done) {
  let start = null;
  const back = () => {
    sheet.style.transition = "transform .2s ease-out, opacity .2s ease-out";
    sheet.style.transform = "";
    sheet.style.opacity = "";
  };
  sheet.addEventListener("touchstart", e => {
    const t = e.touches[0];
    start = e.touches.length === 1 && t.clientX >= 24 && t.clientX <= window.innerWidth - 24   // edges: system back
      ? { x: t.clientX, y: t.clientY, time: Date.now(), axis: null, dx: 0 } : null;
  }, { passive: true });
  sheet.addEventListener("touchmove", e => {
    if (!start) return;
    const t = e.touches[0], dx = t.clientX - start.x, dy = t.clientY - start.y;
    if (!start.axis) {
      if (Math.abs(dx) < 10 && Math.abs(dy) < 10) return;
      start.axis = Math.abs(dx) > Math.abs(dy) * 1.2 ? "x" : "y";
    }
    if (start.axis !== "x") return;
    start.dx = dx;
    sheet.style.transition = "none";
    sheet.style.transform = `translateX(${dx}px)`;
    sheet.style.opacity = String(1 - Math.min(Math.abs(dx) / window.innerWidth, 1) * 0.6);
  }, { passive: true });
  sheet.addEventListener("touchend", () => {
    if (!start || start.axis !== "x") { start = null; return; }
    const { dx, time } = start;
    start = null;
    if (Math.abs(dx) < 80 && !(Math.abs(dx) > 30 && Date.now() - time < 250)) { back(); return; }
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) { done(); return; }
    sheet.style.pointerEvents = "none";                  // no second "Next match" while it slides off
    sheet.style.transition = "transform .18s ease-in, opacity .18s ease-in";
    sheet.style.transform = `translateX(${dx < 0 ? "-100%" : "100%"})`;
    sheet.style.opacity = "0";
    setTimeout(done, 180);
  }, { passive: true });
  sheet.addEventListener("touchcancel", () => { if (start) back(); start = null; }, { passive: true });
}

// A match's profile, full screen, from a tap on them anywhere on the Matches page: their photo, what you share, and Bae
// or Nay while it can still change (saved like a swipe), or their handle after the deadline. Only what you have in
// common, as the privacy text says. The back arrow, Escape or the phone's Back closes it.
function closeProfile(fromBack = false) {
  const sheet = document.querySelector(".d-profile");
  if (!sheet) return;
  sheet.remove();
  if (!fromBack && history.state?.nxProfile) history.back();
}
window.addEventListener("popstate", () => closeProfile(true));
document.addEventListener("keydown", e => { if (e.key === "Escape") closeProfile(); });

function openProfile(card, mutual) {
  document.querySelector(".d-profile")?.remove();
  if (!history.state?.nxProfile) history.pushState({ nxProfile: 1 }, "");
  const sheet = el("div", "d-profile");
  sheet.setAttribute("role", "dialog");
  sheet.setAttribute("aria-modal", "true");
  sheet.setAttribute("aria-label", `${card.first}'s profile`);
  const inner = el("div", "d-profile-in");
  const photo = el("div", "d-photo");
  photoOrInitial(photo, card, "d-initial");
  const back = el("button", "d-back");
  back.type = "button";
  back.setAttribute("aria-label", "Back");
  back.append(icon("fa-back"));
  back.addEventListener("click", () => closeProfile());
  photo.append(back);
  if (mutual) photo.append(el("span", "d-ribbon", "It's a match ♥"));
  else {
    const pill = el("span", "d-pill", `⏱ ${leftText(card.decideBy)}`);
    pill.dataset.until = card.decideBy;
    photo.append(pill);
  }
  photo.append(el("span", "d-name", card.first));
  if (mutual) photo.querySelector(".d-ribbon").style.left = "64px";   // (beside the back arrow)
  const { goal, hobbies } = datingWhy(card, true);
  const body = el("div", "d-body");
  body.append(el("p", "d-goal", goal));
  if (mutual) {   // you both said Bae: their whole dating profile, what you share filled in
    const full = datingProfileOf(card);
    if (full.looking.length) body.append(el("p", "d-label", "Looking for"), markedChips(full.looking));
    if (full.type) body.append(el("p", "d-label", "Human Design"), markedChips([{ label: full.type }]));
    if (full.picks.length) body.append(el("p", "d-label", "Quick picks"), markedChips(full.picks));
    if (full.hobbies.length) body.append(el("p", "d-label", "Hobbies"), markedChips(full.hobbies));
    if ([...full.looking, ...full.picks, ...full.hobbies].some(x => x.both)) body.append(el("p", "d-hint d-legend", "Filled in: you both"));
    if (DATE_IDEAS_LIVE || DEMO) body.append(dateIdeasBox(dateIdeas(card), "First date ideas", card));
  } else if (hobbies.length) body.append(el("p", "d-label", "You both like"), chipsFor(hobbies));
  inner.append(photo, body);
  if (mutual) inner.append(card.handle ? copyHandle(card.handle) : el("p", "d-hint", "No handle left. Say hi next time!"));
  else {
    const bar = el("div", "d-vote");
    const note = el("p", "d-hint");
    const buttons = [["bae", "fa-bae", "Bae"], ["nay", "fa-nay", "Nay"]].map(([vote, iconId, label]) => {
      const b = el("button", vote);
      b.type = "button";
      b.append(icon(iconId), document.createTextNode(label));
      b.addEventListener("click", async () => { if (card.vote !== vote) { await setDatingVote(card, vote); show(); } });
      bar.append(b);
      return [vote, b];
    });
    const show = () => {
      buttons.forEach(([vote, b]) => { b.classList.toggle("on", card.vote === vote); b.setAttribute("aria-pressed", card.vote === vote); });
      note.textContent = `Nobody sees your choice. ${card.vote ? "You can change it" : "Choose"} until ${whenText(card.decideBy)}.`;
    };
    show();
    inner.append(bar, note);
  }
  sheet.append(inner);
  document.body.append(sheet);
  back.focus();
}

function drawDating() {
  const list = document.getElementById("match-list");
  const hint = document.getElementById("matches-hint");
  list.replaceChildren();
  const { open, done } = dating;

  if (open.length) {
    const stack = open.filter(c => !c.vote || datingRewound.has(c.matchId));
    const decided = open.filter(c => c.vote && !datingRewound.has(c.matchId));
    const block = el("li", "d-block");
    const head = el("div", "d-head");
    head.append(el("p", "d-label", "To decide"), el("p", "d-label", stack.length ? `${stack.length} left` : "All decided"));
    const deck = el("div", "d-deck");
    deck.tabIndex = 0;
    deck.setAttribute("aria-label", "Matches to decide: right arrow for Bae, left arrow for Nay, Enter for their profile");
    if (!stack.length) {
      const d = el("div", "d-done");
      const inner = el("div");
      inner.append(el("strong", "", "All decided"), document.createTextNode("You can still change any of them below."));
      d.append(inner);
      deck.append(d);
    }
    stack.slice(0, 3).reverse().forEach((c, i, arr) => deck.append(swipeCard(c, arr.length - 1 - i)));
    if (stack.length) dragCard(deck.lastElementChild, stack[0]);
    deck.addEventListener("keydown", e => {
      if (stack.length && e.key === "Enter") return openProfile(stack[0], false);
      if (!stack.length || !["ArrowRight", "ArrowLeft"].includes(e.key)) return;
      e.preventDefault();
      buzz();
      swipeMatch(stack[0], e.key === "ArrowRight" ? "bae" : "nay", deck.lastElementChild);
    });
    const actions = el("div", "d-actions");
    const lastSwiped = () => open.find(c => c.matchId === datingSwiped[datingSwiped.length - 1]);
    const rewind = roundButton("rewind", "fa-rewind", "Rewind: choose again for the last one you swiped", () => {
      const c = lastSwiped();
      if (!c) return;
      datingSwiped.pop();
      datingRewound.add(c.matchId);   // back on top of the stack; its last choice stays until a new swipe
      drawDating();
    });
    rewind.disabled = !lastSwiped();
    const nay = roundButton("nay", "fa-nay", "Nay", () => stack[0] && swipeMatch(stack[0], "nay", deck.lastElementChild));
    const bae = roundButton("bae", "fa-bae", "Bae", () => stack[0] && swipeMatch(stack[0], "bae", deck.lastElementChild));
    nay.disabled = bae.disabled = !stack.length;
    actions.append(rewind, nay, bae);
    block.append(head, deck, actions, el("p", "d-hint", "Swipe right for Bae, left for Nay, or tap to see their profile. Started from what you tapped on your tag."));
    list.append(block);

    if (decided.length) {
      const mine = el("li", "d-block");
      const h = el("div", "d-head");
      const baes = decided.filter(c => c.vote === "bae").length;
      h.append(el("p", "d-label", "Your choices"), el("p", "d-label", `${baes} Bae · ${decided.length - baes} Nay`));
      const ul = el("ul", "d-choices");
      for (const c of decided) {
        const li = el("li", "d-tap");
        li.addEventListener("click", e => { if (!e.target.closest(".d-toggle")) openProfile(c, false); });
        const thumb = el("div", "d-thumb");
        photoOrInitial(thumb, c, "");
        const who = el("div", "d-who");
        who.append(el("b", "", c.first), el("span", "", datingWhy(c).hobbies.join(", ")));
        const toggle = el("div", "d-toggle");
        for (const [vote, cls, label] of [["bae", "b", "♥ Bae"], ["nay", "n", "✕ Nay"]]) {
          const b = el("button", `${cls}${c.vote === vote ? " on" : ""}`, label);
          b.type = "button";
          b.setAttribute("aria-pressed", c.vote === vote);
          b.addEventListener("click", () => c.vote !== vote && setDatingVote(c, vote));
          toggle.append(b);
        }
        li.append(thumb, who, toggle);
        ul.append(li);
      }
      mine.append(h, ul);
      list.append(mine);
    }
  }

  if (done.length) {
    const label = el("li", "d-block");
    label.append(el("p", "d-label", "Mutual Baes"));
    list.append(label);
    for (const c of done) {
      const li = el("li", "d-block d-mutual d-tap");
      li.addEventListener("click", e => { if (!e.target.closest(".d-contact, .d-idea-map, .d-perk")) openProfile(c, true); });
      const photo = el("div", "d-photo");
      photoOrInitial(photo, c, "d-initial");
      photo.append(el("span", "d-ribbon", "It's a match ♥"), el("span", "d-name", c.first));
      const { goal, hobbies } = datingWhy(c);
      const body = el("div", "d-body");
      body.append(el("p", "d-goal", goal), chipsFor(hobbies));
      if (DATE_IDEAS_LIVE || DEMO) body.append(dateIdeasBox(dateIdeas(c).slice(0, 1), "First date idea", c));
      body.append(c.handle ? copyHandle(c.handle) : el("p", "d-hint", "No handle left. Say hi next time!"));
      li.append(photo, body);
      list.append(li);
    }
  }

  if (!open.length && !done.length) {
    const empty = el("li", "empty");
    empty.append(el("strong", "", "No mutual Baes yet"),
                 document.createTextNode(!myTag ? "Send your profile to your tag first: tap its screen, then scan the QR code."
                   : "Tap Bae on the people you'd like to see again. After the event you get some time here to change any Bae or Nay; then the people you both said Bae to show here."));
    list.append(empty);
  }

  const deadline = Math.max(0, ...open.map(c => Date.parse(c.decideBy)));
  hint.textContent = open.length ? `Sealed until ${whenText(deadline)}. Nobody sees your choices; only mutual Baes are shown then.`
    : done.length ? "People you both said Bae to. Only they see your first name and handle."
    : "After the event: time to change any Bae or Nay, then the people you both said Bae to.";
  const badge = document.getElementById("match-count");
  badge.textContent = open.length + done.length;
  badge.hidden = !(open.length + done.length);
}

// Sample people for ?demo=1&e=d (drawn pictures, nothing saved): two to decide, two already decided on the tag, two
// mutual Baes
function demoDating() {
  const until = new Date(Date.now() + 2 * 864e5 + 4 * 36e5).toISOString();
  // Stock photos (Unsplash, free under the Unsplash License), cut to 640 x 640 (twice a real photo, for a sharp mockup).
  // Photo pages: Sam unsplash.com/photos/7fXswhCS9Fk, Mei U4JDjYmjn1g, Ravi rifCUO-4X8k, Lin EKrFx0S7FuM, Jo ZoSb5J3jU28,
  // Alex AhZvzGUeLvs
  const pic = name => `demo/${name}.jpg`;
  return {
    open: [
      { matchId: -1, first: "Sam", goal: "Both: Slow & steady", hobbies: ["Running", "Coffee", "Board games"], vote: "", decideBy: until, photoURL: pic("sam") },
      { matchId: -2, first: "Mei", goal: "Both: See where it goes", hobbies: ["Travel", "Film"], vote: "", decideBy: until, photoURL: pic("mei") },
      { matchId: -3, first: "Ravi", goal: "Both: Slow & steady", hobbies: ["Football"], vote: "bae", decideBy: until, photoURL: pic("ravi") },
      { matchId: -4, first: "Lin", goal: "Generator meets Projector", hobbies: ["Coffee", "Art"], vote: "nay", decideBy: until, photoURL: pic("lin") },
    ],
    done: [
      { tagId: "demo-jo", savedAt: "demo", first: "Jo", goal: "Projector meets Generator", hobbies: ["Live music", "Board games"], photoURL: pic("jo"), handle: "tg:jo_nightowl",
        theirs: { looking: [{ label: "See where it goes" }], type: "Projector", picks: [{ label: "Night owl", both: true }, { label: "Cat person", both: true }, { label: "Spontaneous" }],
                  hobbies: [{ label: "Live music", both: true }, { label: "Board games", both: true }, { label: "Art" }, { label: "Books" }] } },
      { tagId: "demo-alex", savedAt: "demo", first: "Alex", goal: "Both: Slow & steady", hobbies: ["Climbing", "Cooking"], photoURL: pic("alex"), handle: "ig:alex.climbs",
        theirs: { looking: [{ label: "Slow & steady", both: true }], type: "", picks: [{ label: "Early bird", both: true }, { label: "Dog person" }, { label: "Coffee date", both: true }, { label: "Planner" }],
                  hobbies: [{ label: "Climbing", both: true }, { label: "Cooking", both: true }, { label: "Hiking" }, { label: "Travel" }, { label: "Photography" }] } },
    ],
  };
}

// Live partners from the database, once a visit (date_partners in schema.sql: anyone can call it, the demo too). If that
// fails (the migration not run yet, or offline) the list in datePartners stays. Saving on the Partners tab loads again.
let partnersLoaded = null;
function loadPartners() {
  partnersLoaded ??= supabase.rpc("date_partners").then(({ data, error }) => {
    if (error) { console.warn("Date partners not loaded:", error.message); return; }
    datePartners = data.map(r => ({ ...r, interests: interestBits(r.interests) }));
  });
  return partnersLoaded;
}

async function renderDating() {
  await loadPartners();
  if (DEMO) {
    if (!dating.demo) dating = { ...demoDating(), demo: true };
  } else {
    // Three calls (schema.sql): the matches still open to change, each with my own Bae, Nay or nothing yet and its
    // deadline, never their choice or handle (my_dating_choices); the mutual Baes whose window has closed, newest
    // first, with their handle (my_dating_matches); and photos for the same people (my_dating_photos)
    const [open, done, photos] = await Promise.all([supabase.rpc("my_dating_choices"), supabase.rpc("my_dating_matches"),
                                                    supabase.rpc("my_dating_photos")]);
    if (open.error) throw open.error;
    if (done.error) throw done.error;
    if (photos.error) console.error(photos.error);   // (no photos is no reason to show no matches)
    const photo = new Map((photos.data || []).map(r => [r.match_id ? "c" + r.match_id : r.tag_id, r.photo]));
    dating = {
      open: open.data.map(r => ({ matchId: r.match_id, first: r.first, interests: Number(r.interests), offer: r.offer,
                                  seek: r.seek, vote: r.vote, decideBy: r.decide_by, photoURL: photo.get("c" + r.match_id) })),
      done: done.data.map(r => ({ tagId: r.tag_id, savedAt: r.saved_at, first: r.first, handle: r.handle,
                                  interests: Number(r.interests), offer: r.offer, seek: r.seek, photoURL: photo.get(r.tag_id) })),
    };
  }
  drawDating();
  if (dating.done.length && activeTab === "matches") showReveals(dating.done);
  markMatchesSeen();
  // Drawn again just after the first deadline passes, so mutual Baes appear without a reload (a window can be minutes);
  // the countdowns tick every minute
  clearTimeout(revealTimer);
  const soonest = Math.min(...dating.open.map(c => Date.parse(c.decideBy)));
  if (soonest < Infinity && !DEMO) revealTimer = setTimeout(() => renderMatches().catch(console.error),
                                                            Math.max(0, soonest - Date.now()) + 2000);
  clearInterval(countdownTimer);
  if (dating.open.length) countdownTimer = setInterval(() => document.querySelectorAll(".d-pill[data-until]").forEach(p => {
    p.textContent = `⏱ ${leftText(p.dataset.until)}`;
    p.classList.toggle("soon", Date.parse(p.dataset.until) - Date.now() < 36e5);
  }), 60000);
}

async function renderMatches() {
  if (DATING) return renderDating();
  const list = document.getElementById("match-list");
  const hint = document.getElementById("matches-hint");
  let rows, pending, loadCard;
  if (DEMO) {
    rows = DEMO_ROWS;
    pending = { size: 1 };
    loadCard = async uid => DEMO_CARDS[uid] || null;
  } else {
    // One call, newest first, each with its status worked out by the database (my_matches in schema.sql): mutual
    // ones come with the card, waiting ones (their tag hasn't been read yet) without. Rows are keyed by tag ID.
    const { data, error } = await supabase.rpc("my_matches");
    if (error) throw error;
    const cards = new Map(data.filter(r => r.status === "mutual").map(r => [r.tag_id, {
      first: r.first, company: r.company, title: r.title, linkedin: r.linkedin, email: r.email, photoURL: r.photo_url,
      interests: Number(r.interests), offer: r.offer, seek: r.seek }]));
    rows = data.filter(r => r.status !== "not_signed_up").map(r => ({ uid: r.tag_id }));
    pending = { size: data.length - rows.length };
    loadCard = async key => cards.get(key) || null;
  }
  list.replaceChildren();

  let waiting = 0;
  for (const row of rows) {
    let card = null;
    try { card = await loadCard(row.uid); } catch (e) {}
    const li = el("li", card ? "match fade" : "match waiting fade");
    const face = el("div", "initials", card ? (card.first || "?").slice(0, 1).toUpperCase() : "…");
    if (card && /^(https:\/\/|data:image\/jpeg;base64,)/.test(card.photoURL || "")) {   // Google's, or a dating photo
      const img = document.createElement("img");
      img.src = card.photoURL; img.alt = ""; img.referrerPolicy = "no-referrer";
      face.replaceChildren(img);
    }
    const body = el("div");
    li.append(face, body);
    if (!card) {
      waiting++;
      body.append(el("p", "name", "Waiting for their tag"),
                  el("p", "sub", "You'll see who it is once their tag has been returned too."));
      list.append(li);
      continue;
    }
    body.append(el("p", "name", card.first));
    const sub = [card.company, card.title].filter(Boolean).join(" · ");
    if (sub) body.append(el("p", "sub", sub));
    const why = card.why || matchReason(card);
    if (why) body.append(el("p", "why", why));
    const actions = el("div", "actions");
    if (/^https:\/\//i.test(card.linkedin || "")) {
      const a = el("a", "btn btn-ghost", "LinkedIn");
      a.href = card.linkedin; a.target = "_blank"; a.rel = "noopener";
      actions.append(a);
    }
    if (card.email) {
      const a = el("a", "btn btn-ghost", "Email");
      a.href = `mailto:${card.email}`;
      actions.append(a);
    }
    if (actions.children.length) body.append(actions);
    list.append(li);
  }

  if (!rows.length) {
    const empty = el("li", "empty");
    empty.append(el("strong", "", pending.size ? "Almost there" : "No matches yet"),
                 document.createTextNode(!myTag ? "Send your profile to your tag first: tap its screen, then scan the QR code."
                   : "Wear your tag at the event. Your matches appear here after you return your tag at the desk."));
    list.append(empty);
  }
  const notes = [];
  if (waiting) notes.push(`${waiting} waiting for the other person's tag to be returned.`);
  if (pending.size) notes.push(`${pending.size} matched with someone who hasn't set up their profile yet. They'll appear once they do.`);
  hint.textContent = notes.join(" ") || "People your tag matched with. They see your details only if their tag matched you too.";
  const resolved = rows.length - waiting;
  const badge = document.getElementById("match-count");
  badge.textContent = resolved;
  badge.hidden = resolved === 0;
}

const SEND_ERRORS = {
  "closed": "The tag's code has expired. Tap the tag's screen for a new code (or Menu → Settings → Update profile if it already has your profile), then scan it.",
  "bad-code": "This code has expired. Tap the tag's screen, then scan the new QR code.",
  "locked": "Too many tries with a wrong code. Wait a minute, then scan the QR code on the tag again.",
  // A tag on older firmware doesn't know dating profiles (v2)
  "bad-format": DATING ? "This tag needs an update before it can take a dating profile. Ask the organiser."
                       : "The tag couldn't read that profile. Check your details and try again.",
  "wrong-kind": "This tag is set up for a different kind of event. Tap its screen and scan its new QR code.",
};

button.addEventListener("click", async () => {
  if (mode === "howto") { if (!howtoGo(true)) finishHowto(); return; }
  if (mode === "wifi") { wifiGo(true); return; }
  const first = document.getElementById("first");
  if (mode === "wizard" && step === 1 && !first.value.trim()) {
    first.focus(); setStatus("Add your first name to continue.", "err"); return;
  }
  if (mode === "wizard" && step < 3) {
    setStatus("");
    step++; render(); window.scrollTo(0, 0);
    return;
  }
  if (!first.value.trim()) { mode = "wizard"; step = 1; render(); first.focus(); setStatus("Add your first name first.", "err"); return; }
  if (DATING && !(document.getElementById("adult").checked && document.getElementById("consent").checked)) {
    mode = "wizard"; step = 3; render();
    setStatus("Tick both boxes at the bottom to continue. This event is for people aged 18 and over.", "err");
    return;
  }
  const over = overLimit();
  if (over) { mode = "wizard"; step = over.step; render(); window.scrollTo(0, 0); setStatus(over.text, "err"); return; }
  if (TAG_ID && !EVENT_ID) { setStatus(TAG_OLD, "err"); return; }
  saveForm();
  setBusy(true, canSend ? "Sending…" : "Saving…");
  const saved = await saveToAccount();
  try {
    if (canWifi) {                                 // no Bluetooth: the three Wi-Fi steps, then one link to the tag
      try { localStorage.setItem(WIFI_PENDING, JSON.stringify({ id: TAG_ID, ev: EVENT_ID })); } catch (e) {}
      document.getElementById("wifi-go").href =
        `http://192.168.4.1/p?k=${SETUP_CODE}&p=${encodeURIComponent(payload())}`;
      mode = "wifi";
      wifiStep = 1;
      setStatus(saved && user ? "Saved to your account. Now send it to your tag." : "");
      return;
    }
    if (!canSend) {
      mode = "summary";
      setStatus(saved && user ? "Saved to your account." : "Saved on this phone.", "ok");
      return;
    }
    setStatus("Choose your tag in the Bluetooth list…");
    const { result, code } = await sendToTag();
    if (result === "ok") {
      rememberTag(TAG_ID, code);
      let accountOk = saved, tagProblem = "";
      if (user) {
        try {
          tagProblem = await claimTag(TAG_ID, EVENT_ID);
          await renderMatches();
        } catch (e) {
          console.error(e);
          accountOk = false;
        }
      }
      // First time a tag is set up on this phone: walk them through how the badge works
      let firstTime = false;
      try { firstTime = !localStorage.getItem(ONBOARDED); } catch (e) {}
      mode = firstTime ? "howto" : "summary";
      howtoStep = 1;
      if (tagProblem) setStatus(`Sent to your tag. ${tagProblem}`, "err");
      else if (!user) setStatus(SENT_SIGNED_OUT);
      else setStatus(accountOk ? "Done! Your tag should say “Profile saved”."
                               : "Sent to your tag, but saving to your account failed. Try again later.", accountOk ? "ok" : "err");
    } else {
      setStatus(SEND_ERRORS[result] || `The tag replied “${result}”. Try again.`, "err");
    }
  } catch (err) {
    if (err.name === "NotFoundError") {
      setStatus("No tag chosen. Tap the tag's screen so it shows its QR code, then try again.", "err");
    } else {
      setStatus(`Couldn't reach your tag (${err.message}). Move closer and try again.`, "err");
    }
  } finally {
    setBusy(false);
  }
});

// ---------- swipe between pages ----------
// Left/right switches the two tabs, from anywhere on them: the form's steps and the How it works and Wi-Fi cards move
// with the bar's Back and Next. The match cards to decide swipe on their own (dragCard), for Bae or Nay.
function slideIn(el, fromRight) {
  if (!el) return;
  el.classList.remove("from-right", "from-left");
  void el.offsetWidth;                                   // restart the animation
  el.classList.add(fromRight ? "from-right" : "from-left");
}

function swipe(direction) {
  const next = direction === "left";
  if (next && activeTab === "profile") activeTab = "matches";
  else if (!next && activeTab === "matches") activeTab = "profile";
  else return;
  render();
  window.scrollTo(0, 0);
  slideIn(document.getElementById(activeTab === "profile" ? "view-profile" : "matches-section"), next);
}

// Can we move in this direction from here? (My profile is on the left, Matches on the right; Partners only by its tab)
function canSwipe(direction) {
  const next = direction === "left";
  return next ? activeTab === "profile" : activeTab === "matches";
}

// The element that moves under the finger: the whole tab
function currentPanel() {
  return document.getElementById({ profile: "view-profile", matches: "matches-section", partners: "partners-section" }[activeTab]);
}

function resetPanel(el) {
  el.classList.remove("dragging");
  el.style.transition = el.style.transform = el.style.opacity = "";
}

// Drag follows the finger; release past the threshold (or a quick flick) slides the page away, otherwise it springs back
let drag = null;
document.addEventListener("touchstart", e => {
  drag = null;
  if (e.touches.length !== 1 || busy) return;
  const t = e.touches[0];
  if (t.clientX < 24 || t.clientX > window.innerWidth - 24) return;   // screen edges belong to the system back gesture
  // The action bar is for tapping; cropping and the match cards drag themselves; a full-screen reveal or profile
  // shouldn't switch the tab behind it
  if (e.target.closest(".bar, .crop, .d-deck, .d-reveal, .d-profile, .d-voucher")) return;
  drag = { x: t.clientX, y: t.clientY, time: Date.now(), axis: null, dx: 0, el: currentPanel() };
}, { passive: true });

document.addEventListener("touchmove", e => {
  if (!drag || !drag.el) return;
  const t = e.touches[0];
  const dx = t.clientX - drag.x, dy = t.clientY - drag.y;
  if (!drag.axis) {
    if (Math.abs(dx) < 10 && Math.abs(dy) < 10) return;
    drag.axis = Math.abs(dx) > Math.abs(dy) * 1.2 ? "x" : "y";        // decide once: swipe or scroll
    if (drag.axis === "x") drag.el.classList.add("dragging");
  }
  if (drag.axis !== "x") return;
  drag.dx = dx;
  const open = canSwipe(dx < 0 ? "left" : "right");
  const shift = open ? dx : dx * 0.25;                                  // rubber-band where there's nowhere to go
  drag.el.style.transition = "none";
  drag.el.style.transform = `translateX(${shift}px)`;
  drag.el.style.opacity = open ? String(1 - Math.min(Math.abs(dx) / window.innerWidth, 1) * 0.5) : "1";
}, { passive: true });

document.addEventListener("touchend", () => {
  if (!drag || drag.axis !== "x" || !drag.el) { drag = null; return; }
  const { el, dx, time } = drag;
  drag = null;
  const direction = dx < 0 ? "left" : "right";
  const flick = Math.abs(dx) > 30 && Date.now() - time < 250;
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if ((Math.abs(dx) >= 60 || flick) && canSwipe(direction)) {
    if (reduce) { resetPanel(el); swipe(direction); return; }
    el.style.transition = "transform .16s ease-in, opacity .16s ease-in";
    el.style.transform = `translateX(${direction === "left" ? "-45%" : "45%"})`;
    el.style.opacity = "0";
    setTimeout(() => { resetPanel(el); swipe(direction); }, 160);
  } else {
    el.style.transition = "transform .2s ease-out, opacity .2s ease-out";   // spring back
    el.style.transform = "translateX(0)";
    el.style.opacity = "1";
    setTimeout(() => resetPanel(el), 200);
    if (Math.abs(dx) >= 60 && direction === "left" && activeTab === "profile" && mode === "wizard" && step === 1 &&
        !document.getElementById("first").value.trim()) {
      setStatus("Add your first name to continue.", "err");
    }
  }
}, { passive: true });

document.addEventListener("touchcancel", () => { if (drag?.el) resetPanel(drag.el); drag = null; }, { passive: true });

// First paint: returning visitors (profile remembered on this phone) get the one-tap summary
updateInterestCount();
limitChips();
if (hasProfile() && !wifiSent) mode = "summary";   // just back from the tag's Wi-Fi: keep "How it works" / done
if (DEMO) { activeTab = "matches"; renderMatches(); }
if (params.get("view") === "matches") activeTab = "matches";   // the match emails' links open Matches directly
if (params.get("howto") === "1") { activeTab = "profile"; mode = "howto"; }   // open How it works directly
render();
if (TAG_ID && !EVENT_ID && !wifiSent) setStatus(TAG_OLD, "err");
