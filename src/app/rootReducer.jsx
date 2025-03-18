import { combineReducers } from "@reduxjs/toolkit";
import themeSlice from "./features/theme";
import authSlice from "./features/auth";
import userSlice from "./features/user";
import VideoMania from "./features/videomania";
import picTourSlice from "./features/pictours";
import mondoMarketSlice from "./features/mondomarket";
import cinematicSlice from "./features/cinematic";

const rootReducer = combineReducers({
  theme: themeSlice,
  auth: authSlice,
  user: userSlice,
  video_mania: VideoMania,
  pictours: picTourSlice,
  mondomarket: mondoMarketSlice,
  cinematics: cinematicSlice,
});

export default rootReducer;
