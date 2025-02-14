const Users = require("../model/users");
const { HttpCode } = require("../helpers/constants");
const UploadAvatar=require("../services/upload-avatars-local")
const jwt = require("jsonwebtoken");
require("dotenv").config();
const EmailService = require("../services/email");
const {
  CreateSenderNodemailer,
  CreateSenderSendgrid,
} = require("../services/sender-email");

const JWT_SECRET_KEY = process.env.JWT_SECRET_KEY;
const AVATARS_OF_USERS = process.env.AVATARS_OF_USERS;

const signup = async (req, res, next) => {
    try {
        const user = await Users.findByEmail(req.body.email);
    if (user) {
        return res.status(HttpCode.CONFLICT).json({
            status: "error",
            code: HttpCode.CONFLICT,
            message: "Email is in use",
        });
        };
        const newUser = await Users.create(req.body);
        const { id, name, email, subscription, avatar, verifyToken } = newUser;
        try {
          const emailService = new EmailService(
            process.env.NODE_ENV,
            new CreateSenderSendgrid()
          );
          await emailService.sendVerifyPasswordEmail(verifyToken, email, name);
        } catch (e) {
          console.log(e.message);
        }
        return res.status(HttpCode.CREATED).json({
          status: "success",
          code: HttpCode.CREATED,
          data: {
            id,
            name,
            email,
            subscription,
            avatar,
            verifyToken,
          },
        });
    } catch (error) {
        next(error);
    }
};

const verify = async (req, res, next) => {
  try {
    const user = await Users.getUserByVerifyToken(req.params.verificationToken);
    if (user) {
      await Users.updateVerifyToken(user.id, true, null);
      return res.status(HttpCode.OK).json({
        status: "success",
        code: HttpCode.OK,
        message: "Verification is successful",
      });
    }
    return res.status(HttpCode.NOT_FOUND).json({
      status: "error",
      code: HttpCode.NOT_FOUND,
      message: "User not found",
    });
  } catch (error) {
    next(error);
  }
};

const repeatSendEmailVerify = async (req, res, next) => {
  const { email } = req.body;
  const user = await Users.findByEmail(email);
  if (user) {
    const { name, email, verifyToken, verify } = user;
    if (!verify) {
      try {
        const emailService = new EmailService(
          process.env.NODE_ENV,
          new CreateSenderNodemailer()
        );
        await emailService.sendVerifyPasswordEmail(verifyToken, email, name);
        return res.status(HttpCode.OK).json({
          status: "success",
          code: HttpCode.OK,
          message: "Verification email sent",
        });
      } catch (error) {
        console.log(error.message);
        return next(error);
      }
    }
    return res.status(HttpCode.BAD_REQUEST).json({
      status: "error",
      code: HttpCode.BAD_REQUEST,
      message: "Verification has already been passed",
    });
  }
  return res.status(HttpCode.NOT_FOUND).json({
    status: "error",
    code: HttpCode.NOT_FOUND,
    message: "User not found",
  });
};

const login = async (req, res, next) => {
    try {
        const { email, password } = req.body;
        const user = await Users.findByEmail(email);
        const isValidPassword = await user?.validPassword(password);
        if (!user || !isValidPassword) {
          return res.status(HttpCode.UNAUTHORIZED).json({
            status: "error",
            code: HttpCode.UNAUTHORIZED,
            message: "Email or password is wrong",
          });
        };
        if (!user.verify) {
          return res.status(HttpCode.UNAUTHORIZED).json({
            status: "error",
            code: HttpCode.UNAUTHORIZED,
            message: "Check email for verification",
          });
        }

        const payload = { id: user.id };
        const token = jwt.sign(payload, JWT_SECRET_KEY, { expiresIn: "2w" });
        await Users.updateToken(user.id, token);
        return res.status(HttpCode.OK).json({
            status: "success",
            code: HttpCode.OK,
            data: {
               token
            },
        });
    } catch (error) {
        next(error)
    }
};

const logout = async (req, res, next) => {
  try {
    const userId = req.user.id;
    await Users.updateToken(userId, null);
    return res.status(HttpCode.NO_CONTENT).json({});
  } catch (error) {
    next(error);
  }
};

const current = async (req, res, next) => {
    try {
        const { email, subscription } = req.user;
        return res.status(HttpCode.OK).json({
            status: 'success ',
            code: HttpCode.OK,
            data: {
                email,
                subscription,
            },
        });
    } catch (error) {
        next(error);
    };
};

const subscription = async (req, res, next) => {
    const userId = req.user.id;
    try {
        const user = await Users.updateSubscription(userId, req.body)
        const { email, subscription } = user;
            return res
                .status(HttpCode.OK)
                .json({ status: "succes", code: HttpCode.OK, data: { email, subscription } })
        
        
    } catch (error) {
        next(error);
    }
};

const avatars = async (req, res, next) => {
    try {
        const id = req.user.id;
        const uploads = new UploadAvatar(AVATARS_OF_USERS);
        const avatarUrl = await uploads.saveAvatarToStatic({
            idUser: id,
            pathFile: req.file.path,
            name: req.file.filename,
            oldFile: req.user.avatar,
        });
        await Users.updateAvatar(id, avatarUrl);

        return res.json({
            status: 'success',
            code: HttpCode.OK,
            data: { avatarUrl },
        })
    }
    catch (error) {
        next(error);
    };
};


module.exports = {
  signup,
  verify,
  repeatSendEmailVerify,
  login,
  logout,
  current,
  subscription,
  avatars,
};