const User = require('../models/User')
const Note = require('../models/Note')
const asyncHandler = require('express-async-handler')
const bcrypt = require('bcrypt')
// note : asyncHandler helps us get rid of try/catch blocks


// @desc Get All Users
// route GET /users
// @access Private
const getAllUsers = asyncHandler(async (req, res) => {
    // select('-password) --> gives user without password!
    const users = await User.find().select('-password').lean()
    if (!users?.length) return res.status(400).json({ message: 'No Users Found' })
    res.json(users)
})

// @desc Create New User
// route POST /users
// @access Private
const createNewUser = asyncHandler(async (req, res) => {
    const { username, password, roles } = req.body

    // Confirm Data
    if (!username || !password || !Array.isArray(roles) || !roles.length) {
        return res.status(400).json({ message: 'All Fields Are Required' })
    }

    // Check For Duplicate
    const duplicate = await User.findOne({ username }).lean().exec()
    if (duplicate) return res.status(409).json({ message: 'Duplicate Username' })

    // Hash Password
    const hashedPwd = await bcrypt.hash(password, 10)

    const userObject = {
        username,
        'password': hashedPwd,
        roles
    }

    // Create And Store New User
    const user = await User.create(userObject)

    if (user) {
        res.status(201).json({ message: `New User ${username} Created` })
    } else {
        res.status(400).json({ message: 'Invalid User Data Recieved' })
    }
})

// @desc Update a User
// route PATCH /users
// @access Private

const updateUser = asyncHandler(async (req, res) => {
    const { id, username, roles, active, password } = req.body

    // Confirm Data
    if (!id || !username || !Array.isArray(roles) || !roles.length || typeof active !== 'boolean') {
        return res.status(400).json({ message: 'All Fields Are Required' })
    }

    const user = await User.findById(id).exec()
    if (!user) res.status(400).json({ message: 'User Not Found' })

    //Check For Duplicate
    const duplicate = await User.findOne({ username }).lean().exec()
    //Allow Updates To The Originial User
    if (duplicate && duplicate?._id.toString() !== id) {
        return res.status(409).json({ message: 'Duplicate Username' })
    }

    // We Don't Always Want To Change Password On Every Edit!

    user.user = username
    user.roles = roles
    user.active = active

    // if we Recieved A Password Then Change It

    if (password) {
        // Hash Password
        user.password = await bcrypt.hash(password, 10)
    }

    const updatedUser = await user.save()

    res.json({ message: `${updatedUser.username} Updated` })
})

// @desc Delete a User
// route DELETE /users
// @access Private
const deleteUser = asyncHandler(async (req, res) => {
    const { id } = req.body
    if (!id) return res.status(400).json({ message: ' User ID Is Required' })

    // We Don't Want To Delete A User If They Have A Note Assigned
    const note = await Note.findOne({ user: id }).lean().exec()
    if (note) return res.status(400).json({ message: 'User Has Assigned Notes' })

    const user = await User.findById(id).exec()
    if (!user) return res.status(400).json({ message: 'User Not Found' })

    // After Deleting User, We'll Send Back The Deleted User Data(or Some Data!)
    const result = await user.deleteOne()
    const reply = `Username ${result.username} With ID ${result._id} Deleted`
    res.json(reply)
})


module.exports = { getAllUsers, createNewUser, updateUser, deleteUser }