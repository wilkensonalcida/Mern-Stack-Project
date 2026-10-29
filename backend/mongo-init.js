db = db.getSiblingDB('TestDB'); // REPLACE with actual DB

if (!db.getCollectionNames().includes('users')) {
  db.createCollection('users');
}

// REPLACE this with an admin account or something
let user = db.users.findOne({ login: "testacc" });
if (!user) {
  // bcrypt hash of "testpass", made with:
  //   node -e "console.log(require('bcryptjs').hashSync('testpass', 10))"
  const result = db.users.insertOne({
    firstName: "Johnny",
    lastName: "Test",
    login: "testacc",
    password: "$2b$10$hGQTDe5ZEIf.ynYDB0Z1h.MRzcQZxf48Lzy2AaFRiyWhgGg3M8NRy",
    email: "",
    role: "user"
  });
  user = { _id: result.insertedId };
}