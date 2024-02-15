import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { User } from "../models/user.models.js";
import {uploadOnCloudinary} from "../utils/cloudinary.js"

const registerUser = asyncHandler(async (req,res)=>{
    // getting data from user from frontend
    const {fullName,email,username,password}=req.body;
    
    // validate the data i.e., it does not contain any unwanted data
    if(
        [fullName,email,username,password].some((field)=>{
            return field?.trim() === "";
        })
    ){
        throw new ApiError(400,"Fields Cannot be Empty");
    }

    // check if user already exist or not 
    const existedUser=User.findOne({
        $or: [ { email } , { username } ]
    })

    if(existedUser){
        throw new ApiError(409, "User already exist");
    }

    // check if the images exist or not - avatar 
    const avatarLocal=req.files?.avatar[0]?.path;
    const coverImageLocal=req.files?.coverImage[0]?.path;

    if(!avatarLocal){
        throw new ApiError(400,"Avatar file is required");
    }

    // upload images to cloudinary
    const avatar=await uploadOnCloudinary(avatarLocal);
    const coverImage=await uploadOnCloudinary(coverImageLocal);

    if(!avatar){
        throw new ApiError(400,"Avatar file is required");
    }

    // create user object - and create a user in db
    const user=await User.create({
        fullName,
        avatar: avatar.url,
        coverImage: coverImage?.url || "",
        email,
        password,
        username: username.toLowerCase()
    });

    // remove password and refresh token field from response from db
    const createdUser=await User.findById(user._id).select(
        "-password -refreshTokens"
    );

    // check if user is created or not
    if(!createdUser){
        throw new ApiError(500,"Could not register user. Try Again.")
    }

    return res.status(201).json(
        new ApiResponse(200,createdUser,"User created successfully.")
    ); 

});

export {registerUser};