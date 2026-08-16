import ReviewSummary from './ReviewSummary';
import ReviewList from './ReviewList';

export default function ProductReviews() {
  return (
    <section
      id="product-reviews"
      style={{ marginTop: '40px' }}
      className="relative w-full z-10 scroll-mt-28"
    >
      <div className="container max-w-[1440px] mx-auto px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16">
          <div className="lg:col-span-4 lg:col-start-1">
            <ReviewSummary />
          </div>
          <div className="lg:col-span-8">
            <ReviewList />
          </div>
        </div>
      </div>
    </section>
  );
}
