import { motion } from "framer-motion";

export default function Card({
  children,
  hover = false,
  className = "",
  onClick,
}) {
  return (
    <motion.div
      whileHover={
        hover ? { y: -4, boxShadow: "0 20px 25px -5px rgb(0 0 0 / 0.1)" } : {}
      }
      onClick={onClick}
      className={`bg-white rounded-xl shadow-md p-6 ${hover ? "cursor-pointer" : ""} ${className}`}
    >
      {children}
    </motion.div>
  );
}
