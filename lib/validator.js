// Custom module: all the server-side validation rules.
// validateUser() returns an object { field: "message" }. An empty object means the data is valid.

const NAME_RE = /^[A-Za-z ]+$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const PHONE_RE = /^[6-9]\d{9}$/;
const COURSES = ["web", "python", "java", "dsa"];

function validateUser(data) {
  const errors = {};
  const name = typeof data.name === "string" ? data.name.trim() : "";
  const email = typeof data.email === "string" ? data.email.trim() : "";
  const phone = typeof data.phone === "string" ? data.phone.trim() : String(data.phone ?? "");
  const password = typeof data.password === "string" ? data.password : "";
  const age = Number(data.age);

  if (!name) errors.name = "Name is required.";
  else if (name.length < 3 || name.length > 40) errors.name = "Name must be 3 to 40 characters.";
  else if (!NAME_RE.test(name)) errors.name = "Name can contain only letters and spaces.";

  if (!email) errors.email = "Email is required.";
  else if (!EMAIL_RE.test(email)) errors.email = "Email is not in a valid format.";

  if (!phone) errors.phone = "Phone number is required.";
  else if (!PHONE_RE.test(phone)) errors.phone = "Phone must be 10 digits and start with 6, 7, 8 or 9.";

  if (data.age === undefined || data.age === "") errors.age = "Age is required.";
  else if (!Number.isInteger(age) || age < 16 || age > 60) errors.age = "Age must be a whole number from 16 to 60.";

  if (!COURSES.includes(data.course)) errors.course = `Course must be one of: ${COURSES.join(", ")}.`;

  if (!password) errors.password = "Password is required.";
  else if (password.length < 8 || !/[A-Za-z]/.test(password) || !/\d/.test(password))
    errors.password = "Password must be at least 8 characters with a letter and a digit.";

  return errors;
}

module.exports = { validateUser, COURSES };
