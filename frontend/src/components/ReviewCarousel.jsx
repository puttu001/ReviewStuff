import { useEffect, useMemo, useRef, useState } from 'react';
import {
  animate,
  motion,
  useMotionValue,
  useTransform,
} from 'motion/react';
import { ExternalLinkIcon } from './Icons';
import RemoteImage from './RemoteImage';
import SiteIcon from './SiteIcon';
import { displayTitle, hostname, siteLabel } from '../utils/format';

function carouselConfig(width) {
  if (width < 390) {
    return {
      distanceDivisor: 95,
      velocityDivisor: 600,
      sensitivity: 180,
      xMultiplier: 42,
      yMultiplier: 15,
      rotationMultiplier: 5,
      scaleReduction: 0.07,
    };
  }

  return {
    distanceDivisor: 120,
    velocityDivisor: 700,
    sensitivity: 220,
    xMultiplier: 54,
    yMultiplier: 18,
    rotationMultiplier: 6,
    scaleReduction: 0.08,
  };
}

function wrapIndex(index, total) {
  return ((index % total) + total) % total;
}

export default function ReviewCarousel({ items, activeIndex, onActiveIndexChange }) {
  const progress = useMotionValue(activeIndex);
  const startProgress = useRef(activeIndex);
  const [viewportWidth, setViewportWidth] = useState(() =>
    typeof window === 'undefined' ? 390 : window.innerWidth,
  );

  const total = items.length;
  const config = useMemo(() => carouselConfig(viewportWidth), [viewportWidth]);

  useEffect(() => {
    function handleResize() {
      setViewportWidth(window.innerWidth);
    }

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  function moveTo(target) {
    animate(progress, target, {
      type: 'spring',
      stiffness: 220,
      damping: 28,
      mass: 0.9,
      onComplete: () => onActiveIndexChange(wrapIndex(target, total)),
    });
  }

  function handleDragEnd(_, info) {
    const distanceShift = -info.offset.x / config.distanceDivisor;
    const velocityShift = -info.velocity.x / config.velocityDivisor;
    let shift = Math.round(distanceShift + velocityShift);

    if (shift === 0 && Math.abs(info.offset.x) > 42) {
      shift = info.offset.x < 0 ? 1 : -1;
    }

    shift = Math.max(-2, Math.min(2, shift));
    moveTo(Math.round(startProgress.current) + shift);
  }

  const activeItem = items[activeIndex];
  const activeHasLink = Boolean(activeItem && hostname(activeItem.content));

  return (
    <section
      className="review-carousel"
      aria-roledescription="carousel"
      aria-label="Items to review"
    >
      <div className="review-carousel__stack">
        <motion.div
          className="review-carousel__drag-surface"
          drag={total > 1 ? 'x' : false}
          dragConstraints={{ left: 0, right: 0 }}
          dragElastic={0}
          onDragStart={() => {
            startProgress.current = progress.get();
          }}
          onDrag={(_, info) => {
            progress.set(progress.get() - info.delta.x / config.sensitivity);
          }}
          onDragEnd={handleDragEnd}
          onKeyDown={(event) => {
            if (total <= 1) return;
            if (event.key === 'ArrowLeft') {
              event.preventDefault();
              startProgress.current = Math.round(progress.get());
              moveTo(startProgress.current - 1);
            }
            if (event.key === 'ArrowRight') {
              event.preventDefault();
              startProgress.current = Math.round(progress.get());
              moveTo(startProgress.current + 1);
            }
          }}
          tabIndex={total > 1 ? 0 : -1}
          aria-label={
            total > 1
              ? 'Drag sideways or use the arrow keys to browse review cards'
              : 'Review card'
          }
        />

        {items.map((item, index) => (
          <ReviewCard
            key={item.id}
            item={item}
            index={index}
            isActive={index === activeIndex}
            total={total}
            progress={progress}
            config={config}
          />
        ))}

        {activeHasLink && (
          <a
            className="review-carousel__open"
            href={activeItem.content}
            target="_blank"
            rel="noreferrer"
            aria-label={`Open ${displayTitle(activeItem)}`}
          >
            <ExternalLinkIcon width={17} height={17} />
            Open
          </a>
        )}
      </div>

      {total > 1 && (
        <div className="review-carousel__pagination" aria-label="Carousel position">
          {items.map((item, index) => (
            <span
              key={item.id}
              className={`review-carousel__page ${
                index === activeIndex ? 'review-carousel__page--active' : ''
              }`}
              aria-hidden="true"
            />
          ))}
          <span className="review-carousel__hint">Swipe to browse</span>
        </div>
      )}
    </section>
  );
}

function ReviewCard({ item, index, isActive, total, progress, config }) {
  const offset = useTransform(progress, (value) => {
    let difference = (index - value) % total;
    if (difference > total / 2) difference -= total;
    if (difference < -total / 2) difference += total;
    return difference;
  });
  const x = useTransform(offset, (value) => value * config.xMultiplier);
  const rotate = useTransform(offset, (value) =>
    Math.abs(value) < 0.05 ? 0 : value * config.rotationMultiplier,
  );
  const y = useTransform(offset, (value) =>
    Math.abs(value) < 0.05 ? 0 : Math.abs(value) * config.yMultiplier,
  );
  const scale = useTransform(
    offset,
    (value) => 1 - Math.abs(value) * config.scaleReduction,
  );
  const opacity = useTransform(offset, (value) =>
    Math.max(0, 1 - Math.max(0, Math.abs(value) - 1.5) * 2),
  );
  const zIndex = useTransform(offset, (value) =>
    Math.round(100 - Math.abs(value) * 10),
  );
  const shadeOpacity = useTransform(offset, [-1, 0, 1], [0.36, 0, 0.36]);
  const copyOpacity = useTransform(offset, [-0.55, 0, 0.55], [0, 1, 0]);
  const host = hostname(item.content);

  return (
    <motion.article
      className={`review-carousel__card ${
        item.fetched_image ? '' : 'review-carousel__card--no-image'
      }`}
      style={{ x, rotate, y, scale, opacity, zIndex }}
      aria-hidden={!isActive}
    >
      {item.fetched_image && (
        <RemoteImage
          className="review-carousel__image"
          src={item.fetched_image}
          alt=""
        />
      )}

      <div className="review-carousel__glow" />
      <div className="review-carousel__gradient" />
      <motion.div className="review-carousel__shade" style={{ opacity: shadeOpacity }} />

      <motion.div className="review-carousel__topic" style={{ opacity: copyOpacity }}>
        {item.topic || 'Uncategorized'}
      </motion.div>

      <motion.div className="review-carousel__copy" style={{ opacity: copyOpacity }}>
        <h1 className="review-carousel__title">{displayTitle(item)}</h1>
        <p className="review-carousel__source">
          {host ? (
            <>
              <SiteIcon
                className="review-carousel__favicon"
                src={item.fetched_favicon}
                url={item.content}
              />
              {siteLabel(item)}
            </>
          ) : (
            'Note'
          )}
        </p>
      </motion.div>
    </motion.article>
  );
}
