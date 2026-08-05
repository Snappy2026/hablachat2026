import datetime
from app.database import engine, Base, SessionLocal
from app.models import Session, Message, ReviewItem, Booking, BotSetting, ReplyPattern
from app.services.claude_engine import DEFAULT_SYSTEM_PROMPT

def seed_demo_data():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        # Initialize Default Bot Settings
        if db.query(BotSetting).filter(BotSetting.key == "auto_reply_enabled").count() == 0:
            db.add(BotSetting(key="auto_reply_enabled", value="true"))
        if db.query(BotSetting).filter(BotSetting.key == "confidence_threshold").count() == 0:
            db.add(BotSetting(key="confidence_threshold", value="0.85"))
        if db.query(BotSetting).filter(BotSetting.key == "system_prompt").count() == 0:
            db.add(BotSetting(key="system_prompt", value=DEFAULT_SYSTEM_PROMPT))

        # Initialize Default Reply Library Patterns
        from app.models import ReplyPattern
        if db.query(ReplyPattern).count() < 22:
            # Delete existing incomplete patterns to re-seed cleanly
            db.query(ReplyPattern).delete()
            db.add_all([
                ReplyPattern(
                    category="Street Arrival & Door Number",
                    keywords="im in the street, on the street, where now, im outside, i am outside, here now, im here, i am here, which door, door number, buzz, where do i go",
                    preferred_reply="Hi babe, I'm door number 5! Just buzz when you get to the door\n\nthanks babe x",
                    auto_send=True,
                    confidence_score=0.98
                ),
                ReplyPattern(
                    category="Short-Notice Availability",
                    keywords="can i come, come in, come over, come now, come today, can i see you, see you in, see you now, free in, free now, are you free, free soon, available now, available today, in 15mins, in 20mins",
                    preferred_reply="Yes babe I can be available! Just message when you are in the street, you have my postcode\n\nthanks babe x",
                    auto_send=True,
                    confidence_score=0.96
                ),
                ReplyPattern(
                    category="Services & Pricing",
                    keywords="how much, rates, pricing, services, price list, price, cost, rate",
                    preferred_reply="Hi babe, here are my services and prices:\n• 60 mins (£130), 30 mins (£80)\n• Full Body Relaxation & Stretch\n• Aromatherapy & Sensual Care\nLet me know what time you are thinking to book and how long you would like!\nthanks babe x",
                    auto_send=True,
                    confidence_score=0.96
                ),
                ReplyPattern(
                    category="Booking Request",
                    keywords="book, appointment, reserve, schedule, tomorrow, slot",
                    preferred_reply="Hi babe, I can do [date] at [time]! Let me know if that time works for you and how long you'd like.\nthanks babe x",
                    auto_send=True,
                    confidence_score=0.95
                ),
                ReplyPattern(
                    category="Reschedule / Change Time",
                    keywords="reschedule, change time, move appointment, move my booking, different time",
                    preferred_reply="Hi babe, I can definitely help you change or move your booking. Let me know what new time works for you!\nthanks babe x",
                    auto_send=True,
                    confidence_score=0.94
                ),
                ReplyPattern(
                    category="Cancellation",
                    keywords="cancel, cancel my booking, dont want to come, not coming, different time",
                    preferred_reply="Hi babe, no worries we can do another time",
                    auto_send=False,
                    confidence_score=0.88
                ),
                ReplyPattern(
                    category="Discount / Deals / Negotiation",
                    keywords="discount, cheap, deal, negotiate, price match, is it free, for free",
                    preferred_reply="Sorry babe i dont do discounts, only in person and when you spend more than 1 hour x",
                    auto_send=False,
                    confidence_score=0.85
                ),
                ReplyPattern(
                    category="Complaint / Refund",
                    keywords="unhappy, bad, terrible, complain, refund, horrible, disappointed",
                    preferred_reply="Hi babe, sorry to hear this x",
                    auto_send=False,
                    confidence_score=0.80
                ),
                ReplyPattern(
                    category="Location / Address / Postcode",
                    keywords="whereareyou, address, postcode, location, directions, howtogetthere",
                    preferred_reply="Hi babe, its [postcode] x",
                    auto_send=True,
                    confidence_score=0.96
                ),
                ReplyPattern(
                    category="Opening Hours / Working Days",
                    keywords="whattimedoyouopen, openinghours, what days, whenareyouopen, hours, working hours, closed",
                    preferred_reply="Babe, im flexible just confirm when you want to come so we can make a booking",
                    auto_send=True,
                    confidence_score=0.95
                ),
                ReplyPattern(
                    category="Payment Methods",
                    keywords="howtopay, cash, card, payment, banktransfer, doyoutakecard",
                    preferred_reply="Yes babe, take cash and transfer x",
                    auto_send=True,
                    confidence_score=0.97
                ),
                ReplyPattern(
                    category="Parking / Transport",
                    keywords="parking, wheretopark, bus, train, nearest station, tube, transport",
                    preferred_reply="There is parking in the street and all around, check the postcode babe and let me know x",
                    auto_send=True,
                    confidence_score=0.95
                ),
                ReplyPattern(
                    category="General Greeting / Hello",
                    keywords="hi, hello, hey, hiya, goodmorning, good afternoon, goodevening",
                    preferred_reply="Hiya Babe thx for the message, do you want to come and see me x",
                    auto_send=True,
                    confidence_score=0.98
                ),
                ReplyPattern(
                    category="Thank You / Goodbye",
                    keywords="thankyou, thanks, cheers, bye, seeyoulater, seeyousoon, ta",
                    preferred_reply="hope to see you soon x",
                    auto_send=True,
                    confidence_score=0.98
                ),
                ReplyPattern(
                    category="Confirmation / On My Way",
                    keywords="onmyway, comingnow, betherein, leaving now, settingoff, omw, nearlythere",
                    preferred_reply="Ok babe just let me know when you are in the street please, and i will give you the door number x",
                    auto_send=True,
                    confidence_score=0.97
                ),
                ReplyPattern(
                    category="Running Late",
                    keywords="runninglate, belate, stuckintraffic, delayed, gonnabelate, sorryimlate",
                    preferred_reply="Ok babe just let me know roughly how long and time you be here. x",
                    auto_send=True,
                    confidence_score=0.96
                ),
                ReplyPattern(
                    category="First-Time Client Questions",
                    keywords="firsttime, neverbeen, whatdoineedtobring, whattoexpect, newclient",
                    preferred_reply="Well you will enjoy great sexy company, get to know eachother little tease i guess and then move onto more exciting moments you will never forget x",
                    auto_send=True,
                    confidence_score=0.94
                ),
                ReplyPattern(
                    category="Inappropriate / Off-Topic",
                    keywords="Anything hardcore",
                    preferred_reply="Babe those things i dont do, anything extra you have to ask in person x",
                    auto_send=False,
                    confidence_score=0.90
                ),
                ReplyPattern(
                    category="Photos / Portfolio Request",
                    keywords="photos, pictures, portfolio, whatdoesitlook like, canisee",
                    preferred_reply="If we get on well maybe, its not something i do and obviously an extra but those things you talk when we see eachother x",
                    auto_send=True,
                    confidence_score=0.95
                ),
                ReplyPattern(
                    category="Duo / Friend Request",
                    keywords="Do you do Duo or have a friend",
                    preferred_reply="Sometimes i have a friend, depends on time and when you come x",
                    auto_send=True,
                    confidence_score=0.95
                ),
                ReplyPattern(
                    category="Return Client Request",
                    keywords="Can i come back, want to return, want to come again",
                    preferred_reply="Ok babe but when, what time x",
                    auto_send=True,
                    confidence_score=0.95
                ),
                ReplyPattern(
                    category="Full Service List & Rates",
                    keywords="What are your services, prices, located, based",
                    preferred_reply="Babe here my services and prices,\n15min - £50, 30min £80, 1hr £130\n\nMy services:\nDifferent positions.\n•Best BJ.\n•Erotic tantric massage.\n•Kissing Foreplay.\n•Erotic show.\n•Hand job.\n•Striptease.\n•Boobjob.\n\nLet me know how long you would like and what time pls",
                    auto_send=True,
                    confidence_score=0.96
                )
            ])
            db.commit()

        db.commit()
        print("Database successfully seeded with default settings & reply patterns!")
    except Exception as e:
        db.rollback()
        print(f"Error seeding database: {e}")
    finally:
        db.close()
