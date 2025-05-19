const asyncHandler = require("express-async-handler");
const Product = require("../model/productModel");
const slugify = require("slugify");
const BiddingProduct = require("../model/biddingProductModel");
const cloudinary = require("cloudinary").v2;

const createProduct = asyncHandler(async (req, res) => {
  const { 
    title, 
    description, 
    price, 
    category, 
    height, 
    lengthpic, 
    width, 
    mediumused, 
    weigth,
    startDate,
    endDate,
    buyNowPrice,
    reservePrice,
    biddingIncrement,
    condition,
    currency
  } = req.body;
  const userId = req.user.id;

  // Debug logging
  console.log("Received in createProduct controller:");
  console.log("Currency:", currency);
  console.log("Price:", price);
  console.log("BuyNowPrice:", req.body.buyNowPrice);
  console.log("Body:", req.body);

  // Validate dates
  if (new Date(startDate) >= new Date(endDate)) {
    res.status(400);
    throw new Error("End date must be after start date");
  }

  // Validate prices
  if (buyNowPrice && buyNowPrice <= price) {
    res.status(400);
    throw new Error("Buy Now Price must be higher than starting price");
  }

  if (reservePrice && reservePrice <= price) {
    res.status(400);
    throw new Error("Reserve Price must be higher than starting price");
  }

  const originalSlug = slugify(title, {
    lower: true,
    remove: /[*+~.()'"!:@]/g,
    strict: true,
  });

  let slug = originalSlug;
  let suffix = 1;

  while (await Product.findOne({ slug })) {
    slug = `${originalSlug}-${suffix}`;
    suffix++;
  }

  if (!title || !description || !price || !startDate || !endDate || !biddingIncrement || !condition || !currency) {
    res.status(400);
    throw new Error("Please fill in all required fields");
  }

  let fileData = {};
  if (req.file) {
    let uploadedFile;
    try {
      uploadedFile = await cloudinary.uploader.upload(req.file.path, {
        folder: "Bidding/Product",
        resource_type: "image",
      });
    } catch (error) {
      res.status(500);
      throw new Error("Image could not be uploaded");
    }

    fileData = {
      fileName: req.file.originalname,
      filePath: uploadedFile.secure_url,
      fileType: req.file.mimetype,
      public_id: uploadedFile.public_id,
    };
  }

  // Process multiple images if they exist
  let imagesArray = [];
  
  // Add main image to images array if it exists
  if (Object.keys(fileData).length > 0) {
    imagesArray.push(fileData);
  }
  
  if (req.files && req.files.images) {
    const uploadPromises = req.files.images.map(async (file) => {
      try {
        const uploadedFile = await cloudinary.uploader.upload(file.path, {
          folder: "Bidding/Product",
          resource_type: "image",
        });
        
        return {
          fileName: file.originalname,
          filePath: uploadedFile.secure_url,
          fileType: file.mimetype,
          public_id: uploadedFile.public_id,
        };
      } catch (error) {
        console.error("Error uploading file:", error);
        return null;
      }
    });
    
    const additionalImages = (await Promise.all(uploadPromises)).filter(item => item !== null);
    imagesArray = [...imagesArray, ...additionalImages];
  }

  const product = await Product.create({
    user: userId,
    title,
    slug: slug,
    description,
    price,
    category,
    height,
    lengthpic,
    width,
    mediumused,
    weigth,
    image: fileData,
    images: imagesArray,
    startDate,
    endDate,
    buyNowPrice: buyNowPrice || null,
    reservePrice: reservePrice || null,
    biddingIncrement,
    condition,
    currency,
    biddingPrice: price,
  });
  res.status(201).json({
    success: true,
    data: product,
  });
});

const getAllProducts = asyncHandler(async (req, res) => {
  const products = await Product.find({}).sort("-createdAt").populate("user");

  const productsWithDetails = await Promise.all(
    products.map(async (product) => {
      const latestBid = await BiddingProduct.findOne({ product: product._id }).sort("-createdAt");
      const biddingPrice = latestBid ? latestBid.price : product.price;

      const totalBids = await BiddingProduct.countDocuments({ product: product._id });

      return {
        ...product._doc,
        biddingPrice,
        totalBids, // Adding the total number of bids
      };
    })
  );

  res.status(200).json(productsWithDetails);
});

const getAllProductsofUser = asyncHandler(async (req, res) => {
  const userId = req.user._id;

  const products = await Product.find({ user: userId }).sort("-createdAt").populate("user");

  const productsWithPrices = await Promise.all(
    products.map(async (product) => {
      const latestBid = await BiddingProduct.findOne({ product: product._id }).sort("-createdAt");
      const biddingPrice = latestBid ? latestBid.price : product.price;
      return {
        ...product._doc,
        biddingPrice, // Adding the price field
      };
    })
  );

  res.status(200).json(productsWithPrices);
});

const getWonProducts = asyncHandler(async (req, res) => {
  const userId = req.user._id;

  const wonProducts = await Product.find({ soldTo: userId }).sort("-createdAt").populate("user");

  const productsWithPrices = await Promise.all(
    wonProducts.map(async (product) => {
      const latestBid = await BiddingProduct.findOne({ product: product._id }).sort("-createdAt");
      const biddingPrice = latestBid ? latestBid.price : product.price;
      return {
        ...product._doc,
        biddingPrice, // Adding the price field
      };
    })
  );

  res.status(200).json(productsWithPrices);
});

const getAllSoldProducts = asyncHandler(async (req, res) => {
  const product = await Product.find({ isSoldout: true }).sort("-createdAt").populate("user");
  res.status(200).json(product);
});
const getProductBySlug = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const product = await Product.findById(id);
  if (!product) {
    res.status(404);
    throw new Error("Product not found");
  }
  res.status(200).json(product);
});
const deleteProduct = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const product = await Product.findById(id);

  if (!product) {
    res.status(404);
    throw new Error("Product not found");
  }
  if (product.user?.toString() !== req.user.id) {
    res.status(401);
    throw new Error("User not authorized");
  }

  if (product.image && product.image.public_id) {
    try {
      await cloudinary.uploader.destroy(product.image.public_id);
    } catch (error) {
      console.error("Error deleting image from Cloudinary:", error);
    }
  }

  await Product.findByIdAndDelete(id);
  res.status(200).json({ message: "Product deleted." });
});
const updateProduct = asyncHandler(async (req, res) => {
  const { 
    title, 
    description, 
    price, 
    height, 
    lengthpic, 
    width, 
    mediumused, 
    weigth,
    startDate,
    endDate,
    buyNowPrice,
    reservePrice,
    biddingIncrement,
    condition
  } = req.body;
  const { id } = req.params;
  const product = await Product.findById(id);

  if (!product) {
    res.status(404);
    throw new Error("Product not found");
  }
  if (product.user.toString() !== req.user.id) {
    res.status(401);
    throw new Error("User not authorized");
  }

  // Validate dates if provided
  if (startDate && endDate && new Date(startDate) >= new Date(endDate)) {
    res.status(400);
    throw new Error("End date must be after start date");
  }

  // Validate prices if provided
  if (buyNowPrice && buyNowPrice <= price) {
    res.status(400);
    throw new Error("Buy Now Price must be higher than starting price");
  }

  if (reservePrice && reservePrice <= price) {
    res.status(400);
    throw new Error("Reserve Price must be higher than starting price");
  }

  let fileData = {};
  if (req.file) {
    let uploadedFile;
    try {
      uploadedFile = await cloudinary.uploader.upload(req.file.path, {
        folder: "Product-Images",
        resource_type: "image",
      });
    } catch (error) {
      res.status(500);
      throw new Error("Image could not be uploaded");
    }

    if (product.image && product.image.public_id) {
      try {
        await cloudinary.uploader.destroy(product.image.public_id);
      } catch (error) {
        console.error("Error deleting previous image from Cloudinary:", error);
      }
    }
    fileData = {
      fileName: req.file.originalname,
      filePath: uploadedFile.secure_url,
      fileType: req.file.mimetype,
      public_id: uploadedFile.public_id,
    };
  }

  // Process multiple images if they exist
  let imagesArray = product.images || [];
  
  // If replacing main image, update images array accordingly
  if (Object.keys(fileData).length > 0) {
    // Remove old main image from images array if it exists
    if (product.image && product.image.public_id) {
      imagesArray = imagesArray.filter(img => 
        img.public_id !== product.image.public_id
      );
    }
    // Add new main image to beginning of images array
    imagesArray = [fileData, ...imagesArray];
  }
  
  if (req.files && req.files.images) {
    // Delete previous images if requested
    if (req.body.replaceAllImages === 'true' && product.images && product.images.length > 0) {
      for (const img of product.images) {
        if (img.public_id) {
          try {
            await cloudinary.uploader.destroy(img.public_id);
          } catch (error) {
            console.error("Error deleting previous images from Cloudinary:", error);
          }
        }
      }
      
      // Reset images array but keep main image if it was just updated
      imagesArray = Object.keys(fileData).length > 0 ? [fileData] : [];
    }
    
    const uploadPromises = req.files.images.map(async (file) => {
      try {
        const uploadedFile = await cloudinary.uploader.upload(file.path, {
          folder: "Bidding/Product",
          resource_type: "image",
        });
        
        return {
          fileName: file.originalname,
          filePath: uploadedFile.secure_url,
          fileType: file.mimetype,
          public_id: uploadedFile.public_id,
        };
      } catch (error) {
        console.error("Error uploading file:", error);
        return null;
      }
    });
    
    const newImages = (await Promise.all(uploadPromises)).filter(item => item !== null);
    imagesArray = [...imagesArray, ...newImages];
  }

  const updatedProduct = await Product.findByIdAndUpdate(
    { _id: id },
    {
      title,
      description,
      price,
      height,
      lengthpic,
      width,
      mediumused,
      weigth,
      image: Object.keys(fileData).length === 0 ? Product?.image : fileData,
      images: imagesArray,
      startDate: startDate || product.startDate,
      endDate: endDate || product.endDate,
      buyNowPrice: buyNowPrice || product.buyNowPrice,
      reservePrice: reservePrice || product.reservePrice,
      biddingIncrement: biddingIncrement || product.biddingIncrement,
      condition: condition || product.condition
    },
    {
      new: true,
      runValidators: true,
    }
  );
  res.status(200).json(updatedProduct);
});

// for admin only users
const verifyAndAddCommissionProductByAmdin = asyncHandler(async (req, res) => {
  const { commission } = req.body;
  const { id } = req.params;

  const product = await Product.findById(id);
  if (!product) {
    res.status(404);
    throw new Error("Product not found");
  }

  product.isverify = true;
  product.commission = commission;

  await product.save();

  res.status(200).json({ message: "Product verified successfully", data: product });
});

const getAllProductsByAmdin = asyncHandler(async (req, res) => {
  const products = await Product.find({}).sort("-createdAt").populate("user");

  const productsWithPrices = await Promise.all(
    products.map(async (product) => {
      const latestBid = await BiddingProduct.findOne({ product: product._id }).sort("-createdAt");
      const biddingPrice = latestBid ? latestBid.price : product.price;
      return {
        ...product._doc,
        biddingPrice, // Adding the price field
      };
    })
  );

  res.status(200).json(productsWithPrices);
});

// dot not it
const deleteProductsByAmdin = asyncHandler(async (req, res) => {
  try {
    const { productIds } = req.body;

    const result = await Product.findOneAndDelete({ _id: productIds });

    res.status(200).json({ message: `${result.deletedCount} products deleted successfully` });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = {
  createProduct,
  getAllProducts,
  getWonProducts,
  getProductBySlug,
  deleteProduct,
  updateProduct,
  verifyAndAddCommissionProductByAmdin,
  getAllProductsByAmdin,
  deleteProductsByAmdin,
  getAllSoldProducts,
  getAllProductsofUser,
};
