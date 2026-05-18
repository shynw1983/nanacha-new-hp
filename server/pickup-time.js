const TOKYO_TIME_ZONE = "Asia/Tokyo";

const getTokyoParts = (date = new Date()) => {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: TOKYO_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);

  return Object.fromEntries(parts.map((part) => [part.type, part.value]));
};

const getTokyoDateString = (date = new Date()) => {
  const parts = getTokyoParts(date);
  return `${parts.year}-${parts.month}-${parts.day}`;
};

const getTokyoMinutes = (date = new Date()) => {
  const parts = getTokyoParts(date);
  return Number(parts.hour) * 60 + Number(parts.minute);
};

const toMinutes = (time = "") => {
  const [hour, minute] = String(time).split(":").map(Number);
  return hour * 60 + minute;
};

const addDays = (dateString, amount) => {
  const [year, month, day] = dateString.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day + amount));
  return date.toISOString().slice(0, 10);
};

const compareDateTime = (leftDate, leftTime, rightDate, rightTime) =>
  `${leftDate}T${leftTime}`.localeCompare(`${rightDate}T${rightTime}`);

const getMinimumPickupDateTime = (now = new Date(), leadMinutes = 5) => {
  const minimum = new Date(now.getTime() + leadMinutes * 60 * 1000);
  const parts = getTokyoParts(minimum);

  return {
    date: `${parts.year}-${parts.month}-${parts.day}`,
    time: `${parts.hour}:${parts.minute}`,
  };
};

const parseOpeningWindow = (hours = "") => {
  const match = String(hours).match(/^(\d{2}:\d{2})-(\d{2}:\d{2})$/);
  if (!match) {
    return null;
  }

  const opens = match[1];
  const closes = match[2];
  return {
    opens,
    closes,
    crossesMidnight: toMinutes(closes) <= toMinutes(opens),
  };
};

const isWithinOpeningWindow = ({ pickupDate, pickupTime, todayDate, hours }) => {
  const window = parseOpeningWindow(hours);
  if (!window) {
    return true;
  }

  const pickupMinutes = toMinutes(pickupTime);
  const openMinutes = toMinutes(window.opens);
  const closeMinutes = toMinutes(window.closes);

  if (!window.crossesMidnight) {
    return pickupDate === todayDate && pickupMinutes >= openMinutes && pickupMinutes <= closeMinutes;
  }

  const tomorrowDate = addDays(todayDate, 1);
  return (
    (pickupDate === todayDate && pickupMinutes >= openMinutes) ||
    (pickupDate === tomorrowDate && pickupMinutes <= closeMinutes)
  );
};

module.exports = {
  TOKYO_TIME_ZONE,
  addDays,
  compareDateTime,
  getMinimumPickupDateTime,
  getTokyoDateString,
  getTokyoMinutes,
  isWithinOpeningWindow,
  parseOpeningWindow,
  toMinutes,
};
