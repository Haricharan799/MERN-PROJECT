const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken'); 
const db = require('./config/db')
const User =require("./RBAC/usersSchema")
const student = require('./RBAC/studentSchema');
const mentor =require("./RBAC/mentorsSchema")
const Faculty = require('./RBAC/facultysSchema');
const Lead = require('./RBAC/leadSchema');
const Hackathons = require('./RBAC/createHackathon');
const mongoose = require('mongoose');
const app = express();
const cors = require('cors');
const axios = require('axios');
app.use(express.json()); 
app.use(cors())
const secretKey = "guru";

const generateToken = (user) => {
  return jwt.sign({ id: user._id, username: user.username }, secretKey, {
    expiresIn: "7d",
  });
};


// Signup route  
app.post('/signup', async (req, res) => {
    await db()
    const { username, email, password, role } = req.body;

    try {
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ message: 'User already exists' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const newUser = new User({
            username,
            email,
            password: hashedPassword, 
            role 
        });

        await newUser.save();
        res.status(201).json({ message: 'User registered successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
});

// sign-up with google 

app.post("google-signup" ,async (req, res) => 
    {
    const userInfo = req.body;

    try {
        let user = await User.findOne({ email: userInfo.email })
        console.log(user)

        if (!user) {
            user = new User({
                name: userInfo.name,
                email: userInfo.email,
                image: userInfo.image,
                password: "",
                role: "empty"
            });

            await user.save();
        }
        const token = jwt.sign({
            name: user.name,
            email: user.email,
            image: user.image,
            role: user.role,
            userId: user._id
        }, "guru", { expiresIn: '7d' });
        const decoded = jwt.verify(token, "guru")
        if (decoded) {
            res.json({ 
                success: true, 
                token, 
                role: user.role, 
                message: "Login Success", 
                user 
            })
        }

    } catch (err) {
        res.status(500).json({ success: false, message: "An error occurred, please try again!" });
    }
})

  

// Login route
app.post("/login", async (req, res) => {
    await db()
    const { email, password,role } = req.body;
    try {
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(400).send({ message: "User not found" });
        }
      
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).send({ message: "Invalid password" });
        }

        const roleData = {
            email:email,
            role:"empty",
        
            userId :user._id
        }

        const token = generateToken(user); 
        res.status(200).send({ token: token,roleData:roleData, message: 'User logged in successfully.' });
    } catch (err) {
        console.log("Login error:", err);
        res.status(500).send({ message: "Error logging in." });
    }
});

app.post("/student", async (req, res) => {
    await db(); 
    const { college, branch, rollnumber, userId } = req.body;

    console.log(req.body, "Received Data");

    try {
        const FindUserInfo=await User.findOne({_id:userId,$or: [{ role: { $exists: false } }, { role: "empty" }]})
        if(!FindUserInfo){
            return res.status(400).send({message:"Your are not correct user"})
        }

        const FindStudentInfo = await student.findOne({ userId: userId });
        if (FindStudentInfo) {
            return res.status(400).send({ message: "Student already exists" });
        }

        const newUserData = new student({
            userId: FindUserInfo._id,
            college,
            branch,
            rollnumber,
            email: FindUserInfo.email,
            username: FindUserInfo.username,
            role: "student",
        });

        await newUserData.save(); 

        await User.updateOne({ _id: FindUserInfo._id }, { $set: { role: "student" } });

        return res.status(200).send({ message: "Profile created successfully!" });

    } catch (error) {
        console.error("Error creating profile:", error);
        return res.status(500).send({ message: "Internal Server Error" });
    }
});
app.post("/mentor",async (req,res)=>{
    await db()
    const {phonenumber,linkedin,githubId,availabilityStatus,position,companyName,experience,expertiseAreas,userId}=req.body
    console.log(req.body,"mentor Data")
    try{
        const FindUserInfo=await User.findOne({_id:userId,$or: [{ role: { $exists: false } }, { role: "empty" }]})
        if(!FindUserInfo){
            return res.status(400).send({message:"Your are not correct user"})
        }
        const FindMentorInfo=await mentor.findOne({userId:userId})
            if(FindMentorInfo){
                return res.status(400).send({message:"Mentor already exist"})
            }
            

            const newMentorData=new mentor({
                userId:FindUserInfo._id,
                    username:FindUserInfo.username,
                    phonenumber,
                    email:FindUserInfo.email,linkedin,
                    githubId,availabilityStatus,position,companyName,experience,expertiseAreas,
                    role:"mentor"
            })
            await newMentorData.save()
        await User.updateOne({ _id: FindUserInfo._id }, { $set: { role: "mentor" } });
        return res.status(200).send({message:"create successFully"})
        }catch(error){
        console.log("mentor Data submitting error",error);
        
        }
   
    })


    app.post("/faculty", async (req, res) => {
        
        await db(); 
        const { firstName, lastName, email, mobile, dob, gender, department, linkedIn, userId } = req.body;
        console.log(req.body);
    
        try {
            const FindUserInfo=await User.findOne({_id:userId,$or: [{ role: { $exists: false } }, { role: "empty" }]})

        if(!FindUserInfo){
            return res.status(400).send({message:"Your are not correct user"})
        }
            const existingFaculty = await Faculty.findOne({ email });
            if (existingFaculty) {
                return res.status(400).send({ message: "Faculty already exists" });
            }
    
            const newFacultyData = new Faculty({
                userId: FindUserInfo._id,
                firstName,
                lastName,
                email,
                mobile,
                dob,
                gender,
                department,
                linkedIn,
            });
    
            await newFacultyData.save(); 
        await User.updateOne({_id:FindUserInfo._id},{$set:{role:"faculty"}})

            return res.status(201).send({ message: "Faculty profile created successfully!" });
        } catch (error) {
            console.error("Error creating faculty profile:", error);
            return res.status(500).send({ message: "Internal Server Error" });
        }
    });


    app.post("/leads", async (req, res) => {
        await db();
        const { 
            firstName, 
            lastName, 
            email, 
            mobile, 
            dateOfBirth, 
            gender, 
            github, 
            linkedin, 
            portfolio, 
            hackathonRole, 
            skills, 
            experience, 
            availability, 
            address, 
            emergencyContact, 
            twitter, 
            blog, 
            certificates, 
            achievements, 
            userId 
        } = req.body;
    
        console.log(req.body, "lead Data");
    
        try {
            const findUserInfo = await User.findOne({ _id: userId, $or: [{ role: { $exists: false } }, { role: "empty" }] });
            if (!findUserInfo) {
                return res.status(400).send({ message: "You are not a correct user" });
            }
    
            const findLeadInfo = await Lead.findOne({ userId: userId });
            if (findLeadInfo) {
                return res.status(400).send({ message: "Lead already exists" });
            }
    
            const newLeadData = new Lead({
                userId: findUserInfo._id,
                firstName,
                lastName,
                email: findUserInfo.email,
                mobile,
                dateOfBirth,
                gender,
                github,
                linkedin,
                portfolio,
                hackathonRole,
                skills,
                experience,
                availability,
                address,
                emergencyContact,
                twitter,
                blog,
                certificates,
                achievements,
                role: "lead"
            });
    
            await newLeadData.save();
    
            await User.updateOne({ _id: findUserInfo._id }, { $set: { role: "lead" } });
    
            return res.status(200).send({ message: "Lead created successfully" });
        } catch (error) {
            console.log("Lead data submitting error", error);
            return res.status(500).send({ message: "Internal server error" });
        }
    });
    

    // creation hackathon
    app.post('/create-hackathon', async (req, res) => {
        await db();

        const {
            poster,
            name,
            startDate,
            endDate,
            branch = 'CSD',
            year = '1st Year',
            infrastructures = [],
            mentor,
            room
        } = req.body;
        console.log(req.body);
        
    
        try {
            const newHackathon = new Hackathons({
                poster,
                name,
                startDate,
                endDate,
                branch,
                year,
                infrastructures,
                mentor,
                room
            });
    
            await newHackathon.save();
            res.status(201).json({ message: 'Hackathon created successfully', hackathon: newHackathon });
        } catch (error) {
            console.error("Error creating hackathon:", error);
            res.status(500).json({ message: 'Internal server error' });
        }
    });
    app.get('/create-hackathon', async (req, res) => {
        await db();

        try {
          const hackathons = await Hackathons.find();
          res.status(200).json(hackathons);
        } catch (error) {
          console.error("Error fetching hackathons:", error);
          res.status(500).json({ message: "Internal Server Error" });
        }
      });
      
      // Update a hackathon by ID
      app.put('/create-hackathon/:id', async (req, res) => {
        const hackathonId = req.params.id;
    
        // Debugging: Log the received Hackathon ID
        console.log('Received Hackathon ID:', hackathonId);
    
        // Validate the Hackathon ID
        if (!hackathonId || !mongoose.isValidObjectId(hackathonId)) {
            return res.status(400).json({ error: 'Invalid Hackathon ID' });
        }
    
        try {
            // Update the hackathon
            const updatedHackathon = await Hackathon.findByIdAndUpdate(hackathonId, req.body, { new: true });
    
            // Check if the hackathon was found and updated
            if (!updatedHackathon) {
                return res.status(404).json({ error: 'Hackathon not found' });
            }
    
            // Respond with the updated hackathon
            res.status(200).json(updatedHackathon);
        } catch (error) {
            // Handle any errors that occur during the update
            console.error('Error updating hackathon:', error);
            res.status(500).json({ error: 'An error occurred while updating the hackathon' });
        }
    });
    
    
    
    
      
      // Delete a hackathon by ID
      app.delete('/create-hackathon/:id', async (req, res) => {
        await db();

        const { id } = req.params;
      
        try {
          const deletedHackathon = await Hackathons.findByIdAndDelete(id);
      
          if (!deletedHackathon) {
            return res.status(404).json({ message: "Hackathon not found" });
          }
      
          res.status(200).json({ message: "Hackathon deleted successfully" });
        } catch (error) {
          console.error("Error deleting hackathon:", error);
          res.status(500).json({ message: "Internal Server Error" });
        }
      });
      
app.listen(8000, () => {
    console.log("Server is running at http://localhost:8000");
});