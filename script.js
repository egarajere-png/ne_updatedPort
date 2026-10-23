import gsap from "gsap";
import { CustomEase } from "gsap/CustomEase";
import { SplitText } from "gsap/SplitText";

gsap.registerPlugin(CustomEase, SplitText);
CustomEase.create("hop", "0.8, 0, 0.2, 1");
CustomEase.create("hop2", "0.9, 0, 0.1, 1");

const splitText = (selector, type, className, mask = true) => {
    return SplitText.create(selector, {
        type: type,
        [`${type}Class`]: className,
        ...(mask && { mask: type }),
    });
};

// Wait for fonts so SplitText measures the real letter shapes
document.fonts.ready.then(() => {
    splitText(".preloader-header h1", "chars", "char");
    splitText("nav a", "words", "word");
    splitText(".header h1", "chars", "char", false);
    splitText(".hero-footer p", "words", "word");

    // ---- initial states ----
    const preloaderImgInitRotations = [7.5, -2.5, -10, 12.5, -5, 5];

    gsap.set(".preloader-img", {
        xPercent: -50,
        yPercent: -50,
        scale: 0,
        rotate: (i) => preloaderImgInitRotations[i],
        clipPath: "polygon(20% 20%, 80% 20%, 80% 80%, 20% 80%)",
    });

    gsap.set(
        [
            ".preloader-header h1 .char",
            ".preloader-counter p",
            ".header h1 .char",
            "nav a .word",
            ".hero-footer p .word",
        ],
        { y: "100%" }
    );

    // ---- timeline ----
    const t1 = gsap.timeline({
        delay: 0.5,
        onComplete: () => {
            gsap.set(".preloader", { display: "none" });
        },
    });

    // photos spread open
    t1.to(".preloader-img", {
        scale: 1,
        clipPath: "polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%)",
        duration: 1,
        ease: "hop",
        stagger: 0.2,
    });

    // "LOADING..." pushes up
    t1.to(
        ".preloader-header h1 .char",
        {
            y: "0%",
            duration: 1,
            ease: "hop2",
            stagger: { each: 0.125, from: "random" },
        },
        0.35
    );

    // counter appears + counts to 100
    t1.to(
        ".preloader-counter p",
        {
            y: "0%",
            duration: 1,
            ease: "hop2",
            onStart: () => {
                const counterEl = document.querySelector(".preloader-counter p");
                const counter = { value: 0 };

                gsap.to(counter, {
                    value: 100,
                    duration: 2,
                    delay: 0.5,
                    ease: "power2.inOut",
                    onUpdate: () => {
                        counterEl.textContent = String(
                            Math.round(counter.value)
                        ).padStart(3, "0");
                    },
                });
            },
        },
        "<"
    );

    // counter + text leave
    t1.to(
        ".preloader-counter p",
        { y: "-100%", duration: 0.75, ease: "hop2" },
        3.25
    );

    t1.to(
        ".preloader-header h1 .char",
        {
            y: "-100%",
            duration: 0.75,
            ease: "hop2",
            stagger: { each: 0.125, from: "random" },
        },
        3.25
    );

    // photos shrink away
    t1.to(
        ".preloader-images .preloader-img",
        {
            scale: 0,
            clipPath: "polygon(20% 20%, 80% 20%, 80% 80%, 20% 80%)",
            duration: 1,
            ease: "hop2",
            stagger: -0.075,
        },
        3.5
    );

    // whole preloader slides up
    t1.to(
        ".preloader",
        {
            clipPath: "polygon(0% 0%, 100% 0%, 100% 0%, 0% 0%)",
            duration: 1,
            ease: "hop2",
        },
        4.35
    );

    // hero reveals
    t1.to(
        ".header h1 .char",
        {
            y: "0%",
            duration: 1,
            ease: "hop",
            stagger: { each: 0.075, from: "random" },
        },
        4.65
    );

    t1.to(
        "nav a .word",
        { y: "0%", duration: 1, ease: "hop", stagger: 0.075 },
        4.75
    );

    t1.to(
        ".hero-footer p .word",
        { y: "0%", duration: 1, ease: "hop", stagger: 0.075 },
        4.75
    );
}); 