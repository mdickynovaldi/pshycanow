interface HeadingProps {
  title: string;
  description?: string;
}

export const Heading: React.FC<HeadingProps> = ({
  title,
  description,
}) => {
  return (
    <div>
      <h2 className="text-2xl font-bold tracking-tight">{title}</h2>
      {description && (
        <p className="text-sm text-gray-500 mt-1">
          {description}
        </p>
      )}
    </div>
  );
}; 