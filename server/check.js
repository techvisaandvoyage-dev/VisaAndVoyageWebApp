const mongoose = require("mongoose");
const Application = require("./models/Application");

mongoose.connect("mongodb+srv://yashranjan:yashranjan@cluster0.xkvpov1.mongodb.net/VisaAndVoyage?retryWrites=true&w=majority")
  .then(async () => {
    const apps = await Application.find({});
    console.log("Apps count:", apps.length);
    apps.forEach(a => {
      if (["paid", "completed", "success", "captured"].includes(a.paymentStatus)) {
        console.log(a.applicationId, "Payment:", a.paymentStatus, "Status:", a.status);
      }
    });
    process.exit(0);
  });
