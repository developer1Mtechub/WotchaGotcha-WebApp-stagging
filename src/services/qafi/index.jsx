import { useEffect, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import * as Yup from "yup";

import AppSelect from "../../components/form/AppSelect";
import Button from "../../components/form/Button";
import ErrorMessage from "../../components/form/ErrorMessage";
import Form from "../../components/form/Form";
import { Spinner } from "../../components/theme/Loader";
import AppTextArea from "../../components/form/AppTextArea";

import { FaPlusCircle } from "react-icons/fa";
import { Toast } from "../../components/theme/Toast";
import { uploadImage } from "../../utils/common/cloudinary";

import { copyLink } from "../../utils/copyLink";

import {
  addCommentOnQafi,
  addQafi,
  getQafiComments,
  getQafiLikes,
  getQafiSubCategoryByCategory,
  likeUnlikeQafi,
} from "../../app/features/qafi";
import ImagePreviewer from "../../components/previewers/ImagePreviewer";

export const AddQafi = ({ setAddModal, dispatch, setReload, categoryId }) => {
  const { user } = useSelector((state) => state.user);
  const { token } = useSelector((state) => state.auth);
  const { textColor, borderColor, bgColor } = useSelector(
    (state) => state.theme
  );

  const imageRef = useRef(null);

  const [subCategory, setSubCategory] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  const handleAddQafi = async (data, { resetForm }) => {
    setIsLoading(true);
    try {
      const image = await uploadImage(data?.image);
      if (!image) throw new Error("Failed to upload image.");

      const payload = { ...data, image };
      const { statusCode } = await dispatch(
        addQafi({ token, payload })
      ).unwrap();

      if (statusCode === 201) {
        Toast("success", "Qafi uploaded successfully");
        setReload((prev) => !prev);
        setAddModal(false);
        resetForm();
      }
    } catch (error) {
      console.error("Upload Error:", error);
      Toast("error", error?.message || "Error uploading qafi");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const fetchSubCategories = async () => {
      if (categoryId) {
        const { AllCategories } = await dispatch(
          getQafiSubCategoryByCategory({ token, id: categoryId })
        ).unwrap();

        setSubCategory(AllCategories);
      }
    };

    fetchSubCategories();
  }, []);

  return (
    <>
      <Form
        initialValues={{
          description: "",
          category: categoryId,
          sub_category: "",
          image: "",
          user_id: user?.id,
        }}
        validationSchema={Yup.object().shape({
          description: Yup.string().required("Qafi is required"),
          sub_category: Yup.string().required("Sub Category is required"),
          image: Yup.string().required("Image is required"),
        })}
        onSubmit={handleAddQafi}
      >
        {({ handleSubmit, values, handleChange, setFieldValue }) => (
          <div className="flex-col-start gap-5">
            <div className="flex gap-5 items-center">
              <div
                className={`relative capture-container ${borderColor}`}
                onClick={() => imageRef.current.click()}
              >
                <input
                  name="image"
                  ref={imageRef}
                  type="file"
                  onChange={(e) => {
                    const file = e.target.files[0];
                    setFieldValue("image", file);
                  }}
                  accept="image/*"
                  hidden
                />
                {!values?.image ? (
                  <>
                    <FaPlusCircle size={25} className={textColor} />
                    <p>Upload Image</p>
                  </>
                ) : (
                  <>
                    <div
                      className={`px-2 ${bgColor} rounded-full text-white absolute top-0`}
                    >
                      Change Image
                    </div>
                    <img
                      style={{ imageRendering: "-webkit-optimize-contrast" }}
                      src={
                        values.image instanceof File
                          ? URL.createObjectURL(values?.image)
                          : values.image
                      }
                      alt="Image"
                      className="h-full w-full"
                    />
                  </>
                )}
              </div>
            </div>

            <div className="input-container">
              <AppTextArea
                label={"Qafi"}
                name="description"
                value={values.description}
                onChange={handleChange}
              />
              <ErrorMessage name="description" />
            </div>

            <div className="input-container">
              <AppSelect
                label={"Sub Category"}
                name="sub_category"
                value={values.sub_category}
                onChange={handleChange}
                options={subCategory}
              />
              <ErrorMessage name="sub_category" />
            </div>

            <div className="btn-container">
              <Button
                title={"Add"}
                width={false}
                onClick={isLoading ? null : handleSubmit}
                spinner={isLoading ? <Spinner size="sm" /> : null}
              />
            </div>
          </div>
        )}
      </Form>
    </>
  );
};

export const QafiPreviewer = ({ image, isOpen, onClose, isTop = false }) => {
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.user);
  const { token } = useSelector((state) => state.auth);
  const { isLoading } = useSelector((state) => state.qafi);

  const [likes, setLikes] = useState(0);
  const [isLiked, setIsLiked] = useState(false);
  const [comments, setComments] = useState([]);
  const [totalComments, setTotalComments] = useState(0);
  const [commentText, setCommentText] = useState("");

  const handleComment = async () => {
    if (!commentText.trim()) return;

    const previousComments = [...comments];

    try {
      const payload = {
        user_id: user?.id,
        QAFI_id: image?.qafi_id,
        comment: commentText,
      };

      setComments((prev) => [...prev, commentText]);

      const { statusCode } = await dispatch(
        addCommentOnQafi({ payload, token })
      ).unwrap();

      if (statusCode === 201) {
        setCommentText("");
        await getAllComments();
      } else {
        setComments(previousComments);
      }
    } catch (error) {
      setComments(previousComments);
      console.log(error);
    }
  };

  const handleLike = async () => {
    if (!image?.qafi_id) return;

    setIsLiked((prev) => !prev);
    setLikes((prev) => (isLiked ? prev - 1 : prev + 1));

    try {
      const payload = {
        user_id: user?.id,
        QAFI_id: image?.qafi_id,
      };

      const { statusCode } = await dispatch(
        likeUnlikeQafi({ payload, token })
      ).unwrap();

      if (statusCode === 201) {
        await getAllLikes();
      }
    } catch (error) {
      console.log(error);
      setIsLiked((prev) => !prev);
      setLikes((prev) => (isLiked ? prev + 1 : prev - 1));
    }
  };

  const getAllLikes = async () => {
    if (!image?.qafi_id) return;

    try {
      const data = await dispatch(
        getQafiLikes({ token, id: image?.qafi_id })
      ).unwrap();

      setLikes(data?.totalLikes || 0);

      const userHasLiked =
        Array.isArray(data?.AllLikes) &&
        data.AllLikes.some((like) => like.user_id === user?.id);

      setIsLiked(userHasLiked);
    } catch (error) {
      console.error("Error fetching likes:", error);
    }
  };

  const getAllComments = async () => {
    if (!image?.qafi_id) return;

    try {
      const data = await dispatch(
        getQafiComments({ token, id: image?.qafi_id })
      ).unwrap();

      setTotalComments(data?.totalComments || 0);

      setComments(data?.AllComments);
    } catch (error) {
      console.error("Error fetching comments:", error);
    }
  };

  useEffect(() => {
    if (!isTop) {
      getAllLikes();
      getAllComments();
    }
  }, [image?.qafi_id]);

  return (
    <ImagePreviewer
      {...{
        image: image?.image,
        isOpen,
        onClose,
        isTop,
        likes,
        isLoading,
        isLiked,
        commentText,
        setCommentText,
        totalComments,
      }}
      comments={comments}
      OnLike={handleLike}
      OnCopy={() => copyLink(image?.image)}
      onComment={handleComment}
      description={image?.description}
      userImage={image?.user_image || image?.userimage}
      userName={image?.username}
    />
  );
};
