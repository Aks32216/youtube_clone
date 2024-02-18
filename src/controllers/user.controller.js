import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { User } from "../models/user.models.js";
import {uploadOnCloudinary} from "../utils/cloudinary.js"
import jwt from "jsonwebtoken";

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
    const existedUser=await User.findOne({
        $or: [ { email } , { username } ]
    })

    if(existedUser){
        throw new ApiError(409, "User already exist");
    }


    // check if the images exist or not - avatar 
    const avatarLocal=req.files?.avatar[0]?.path;
    // const coverImageLocal=req.files?.coverImage[0]?.path;

    let coverImageLocalPath;
    if(req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length>0){
        coverImageLocalPath=req.files.coverImage[0].path;
    }

    if(!avatarLocal){
        throw new ApiError(400,"Avatar file is required");
    }

    // upload images to cloudinary
    const avatar=await uploadOnCloudinary(avatarLocal);
    const coverImage=await uploadOnCloudinary(coverImageLocalPath);


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

const generateAccessAndRefreshTokens = async (userId)=>{
    try {
        const user=await User.findById(userId);
        const accessToken=user.generateAccessToken();
        const refreshToken=user.generateRefreshToken();
        user.refreshToken=refreshToken;
        await user.save({validateBeforeSave: false});

        return {accessToken,refreshToken};
    } catch (error) {
        throw new ApiError(500,"Something went wrong while generating tokens.")
    }
}

const loginUser = asyncHandler (async (req,res)=>{
    // get credentials from user
    // validate credentials i.e check if they are empty or not
    // validate credentials from database
    // if user exist then generate a access token and refresh token, save them to database, add them to cookies and send it to user
    // redirect user to home page

    const {email,username,password}=req.body;

    if(!username && !email){
        throw new ApiError(400, "Username or password is required");
    }

    let user=await User.findOne({
        $or: [{username},{email}]
    });

    if(!user){
        throw new ApiError(404,"User Does not exist");
    }

    const isPasswordValid=await user.isPasswordCorrect(password);

    if(!isPasswordValid){
        throw new ApiError(401,"password is not valid");
    }

    const {accessToken,refreshToken}=await generateAccessAndRefreshTokens(user._id);

    user=await User.findById(user._id).select("-password -refreshToken");

    const options={
        httpOnly: true
    };

    res.cookie("accessToken",accessToken,options);
    res.cookie("refreshToken",refreshToken,options);
    return res
    .status(200).json(new ApiResponse(200,{user,refreshToken,accessToken},"Logged in successfully"));

})

const logoutUser = asyncHandler (async (req,res)=>{
    // clear all cookies
    const user=req.user;

    await User.findByIdAndUpdate(req.user._id,{
            $set: {
                refreshToken: undefined
            }
        },
        {
            new: true
        }
    );

    const options={
        httpOnly: true,
        secure: true
    };

    res.status(200).clearCookie("accessToken",options)
    .clearCookie("refreshToken",options)
    .json(new ApiResponse(200,{},"user logged out"));


})

const refreshAccessToken = asyncHandler (async (req,res)=>{
    const incomingRefreshToken=req.cookies.refreshToken || req.body.refreshToken;

    if(!incomingRefreshToken){
        throw new ApiError(401,"Unauthorized Access");
    }

    try {
        const decodedToken=jwt.verify(incomingRefreshToken,process.env.REFRESH_TOKEN_SECRET);
    
        const user=await User.findById(decodedToken?._id);
    
        if(!user){
            throw new ApiError(401,"Invalid Refresh Token");
        }
    
        if(incomingRefreshToken !== user?.refreshToken){
            throw new ApiError(401,"Refresh Token is expired or used");
        }
    
        const {refreshToken,accessToken}=await generateAccessAndRefreshTokens(user._id);
    
        const options = {
            httpOnly: true
        }
    
        res.cookie("accessToken",accessToken,options);
        res.cookie("refreshToken",refreshToken,options);
        return res
        .status(200).json(new ApiResponse(200,{user,refreshToken,accessToken},"Access token refreshed"));
    } catch (error) {
        throw new ApiError(409,error?.message || "Invalid refresh Token")
    }

})

export {registerUser,loginUser,logoutUser,refreshAccessToken};